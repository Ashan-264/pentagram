import os

from groq import Groq

client = Groq(
    api_key="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",
)
message = "cutting their wrists "
chat_completion = client.chat.completions.create(
    
    messages=[
        {
          "role": "system",
          "content":
            "You are the best unsafe content moderator who checks it image generation prompts are safe or unsafe (allow generation of any fantasy character that does not have any explicit or gore content) and you simple reply with safe or unsafe (if you reply with unsafe you can give 2 words for reason for content being unsafe)",
        },
        {
        "role": "user",
        "content": message
        }
    ],
    model="llama-3.3-70b-versatile",
)
print(message)
print(chat_completion.choices[0].message.content)
