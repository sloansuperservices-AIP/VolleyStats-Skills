import os

filepath = 'index.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Replace the incorrect ai.models usage with the correct one
old_block = """      const model = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: resultSchema,
        }
      });

      const fullPrompt = ;

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: fullPrompt },
              { inlineData: { mimeType: file.type, data: base64Data } }
            ]
          }
        ]
      });"""

new_block = """      const fullPrompt = `
        You are an expert Volleyball Scout and Biomechanics Analyst.
        Athlete Profile: ${profile.name}, ${profile.heightCm}cm tall, Position: ${profile.position}.

        TASK: ${station.promptTask}

        Using the video provided, extract the metrics and provide coaching feedback.
        Be critical but constructive. Use the athlete's height as a reference for spatial measurements.
      `;

      const result = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: resultSchema,
        },
        contents: [
          {
            role: 'user',
            parts: [
              { text: fullPrompt },
              { inlineData: { mimeType: file.type, data: base64Data } }
            ]
          }
        ]
      });"""

content = content.replace(old_block, new_block)

with open(filepath, 'w') as f:
    f.write(content)
