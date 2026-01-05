import modal
import io
from fastapi import Response, HTTPException, Query,Request
from datetime import datetime, timezone
import requests
import os

def downloadModel():
    from diffusers import AutoPipelineForText2Image
    import torch
    AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.float16, variant="fp16")
    


image = modal.Image.debian_slim() \
    .pip_install_from_requirements("requirements.txt") \
    .pip_install("fastapi[standard]", "transformers", "accelerate", "diffusers", "requests").run_function(downloadModel)

app = modal.App("sd_image_generator",image=image)

@app.cls(image=image,
         gpu = "A10G",
         container_idle_timeout=300,
         secrets=[modal.Secret.from_name("API_KEY")])

class Model:

    
    @modal.enter()
    def load_weights(self):
        from diffusers  import AutoPipelineForText2Image
        import torch

        self.pipe = AutoPipelineForText2Image.from_pretrained(
            "stabilityai/sdxl-turbo",
            torch_dtype=torch.float16,
            variant="fp16"
        )

        self.pipe.to("cuda")
        self.API_KEY = ["API_KEY"]
    
    @modal.web_endpoint()
    def generate(self,request: Request, prompt: str = Query(...,description="The prompt for image generation")):
        image = self.pipe(prompt, num_inference_steps=2,guidance_scale=1.0).images[0]

        api_key = request.headers.get("X-API-KEY")

       # if api_key != self.API_KEY:
         #   raise HTTPException(status_code=401, detail="HTTP: unauthorized access")
        
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG")

        return Response(content = buffer.getvalue(), media_type="image/jpeg")
    


    @modal.web_endpoint()
    def health(self):
        """Lightweight endpoint for eeping container warm"""
        return {"status":"healthy" , "timestamp": datetime.now(timezone.utc).isoformat()}


# Disabled to reduce Modal usage costs
# @app.function(
#     schedule=modal.Cron("*/5 * * * *"),
#     #secrets=(modal.Secret.from_name("API_KEY"))
#     
# )

# def keep_warm():
#     health_url="https://ashan-264--sd-image-generator-model-health.modal.run"
#     generate_url="https://ashan-264--sd-image-generator-model-generate.modal.run"
#     #health_url="https://ashan-264--sd-image-generator-model-health-dev.modal.run"
#     #generate_url= "https://ashan-264--sd-image-generator-model-generate-dev.modal.run"

#     #First check health endpoint
#     health_response= requests.get(health_url)
#     print(f"Health check at: {health_response.json() ['timestamp']}")

#     #Then make a test request to generate endpoint with API key
#     # headers = {"X-API-KEY":os.environ["API-KEY"]}
#     # generate_response = requests.get(generate_url, headers=headers)
#     # print(f"Generate endpoint test successfully at: {datetime.now(timezone.utc).isoformat()}")