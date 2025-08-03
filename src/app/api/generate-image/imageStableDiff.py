import io
import random
import time
from pathlib import Path
import slugify

import modal

MINUTES = 60
app = modal.App("stable-diffusion")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "accelerate==0.33.0",
        "diffusers==0.31.0",
        "fastapi[standard]==0.115.4",
        "huggingface-hub[hf_transfer]==0.25.2",
        "sentencepiece==0.2.0",
        "torch==2.5.1",
        "torchvision==0.20.1",
        "transformers~=4.44.0",
        "slugify"
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})  # faster downloads
)

with image.imports():
    import diffusers
    import torch
    from fastapi import Response

model_id = "adamo1139/stable-diffusion-3.5-large-turbo-ungated"
model_revision_id = "9ad870ac0b0e5e48ced156bb02f85d324b7275d2"


from diffusers import StableDiffusion3Pipeline



@app.cls(image=image, gpu="A10G", timeout=10 * MINUTES)
class Inference:
    @modal.enter()
    def initialize(self):
        # 1) fp16 halves most of the weight memory
        # 2) low_cpu_mem_usage streams from disk/Hub to avoid extra copies
        # 3) device_map="balanced" + offload_folder/​offload_state_dict spills all non-critical chunks to CPU
        self.pipe = StableDiffusion3Pipeline.from_pretrained(
            model_id,
            revision=model_revision_id,
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True,
            device_map="balanced",
            offload_folder="/tmp/offload",
            offload_state_dict=True,
        )
        # 4) slice attention into smaller windows
        self.pipe.enable_attention_slicing()
        # 5) if you installed xformers, this gives another ~30% mem win
        try:
            self.pipe.enable_xformers_memory_efficient_attention()
        except Exception:
            pass

    @modal.enter()
    def move_to_gpu(self):
        # all the heavy bits are already placed on GPU/CPU for you—
        # you can safely leave this empty (or remove it entirely).
        return



    @modal.method()
    def run(
        self, prompt: str, batch_size: int = 4, seed: int = None
    ) -> list[bytes]:
        seed = seed if seed is not None else random.randint(0, 2**32 - 1)
        print("seeding RNG with", seed)
        torch.manual_seed(seed)
        images = self.pipe(
            prompt,
            num_images_per_prompt=batch_size,  # outputting multiple images per prompt is much cheaper than separate calls
            num_inference_steps=4,  # turbo is tuned to run in four steps
            guidance_scale=0.0,  # turbo doesn't use CFG
            max_sequence_length=512,  # T5-XXL text encoder supports longer sequences, more complex prompts
        ).images

        image_output = []
        for image in images:
            with io.BytesIO() as buf:
                image.save(buf, format="PNG")
                image_output.append(buf.getvalue())
        torch.cuda.empty_cache()  # reduce fragmentation
        return image_output

    @modal.web_endpoint(docs=True)
    def web(self, prompt: str, seed: int = None):
        return Response(
            content=self.run.local(  # run in the same container
                prompt, batch_size=1, seed=seed
            )[0],
            media_type="image/png",
        )

@app.local_entrypoint()
def entrypoint(
    samples: int = 4,
    prompt: str = "Mountain biking tricks",
    batch_size: int = 1,
    seed: int = None,
):
    print(
        f"prompt => {prompt}",
        f"samples => {samples}",
        f"batch_size => {batch_size}",
        f"seed => {seed}",
        sep="\n",
    )

    #output_dir = Path("/tmp/stable-diffusion")
    output_dir = Path("C:/Users/User/Documents/pentagram/output")
    output_dir.mkdir(exist_ok=True, parents=True)

    inference_service = Inference()

    for sample_idx in range(samples):
        start = time.time()
        images = inference_service.run.remote(prompt, batch_size, seed)
        duration = time.time() - start
        print(f"Run {sample_idx+1} took {duration:.3f}s")
        if sample_idx:
            print(
                f"\tGenerated {len(images)} image(s) at {(duration)/len(images):.3f}s / image."
            )
        for batch_idx, image_bytes in enumerate(images):
            output_path = (
                output_dir
                / f"output_{(prompt)[:64]}_{str(sample_idx).zfill(2)}_{str(batch_idx).zfill(2)}.png"
            )
            if not batch_idx:
                print("Saving outputs", end="\n\t")
            print(
                output_path,
                end="\n" + ("\t" if batch_idx < len(images) - 1 else ""),
            )
            output_path.write_bytes(image_bytes)

