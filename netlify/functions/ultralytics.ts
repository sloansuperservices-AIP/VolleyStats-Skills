import type { Context } from "@netlify/functions";

export default async (request: Request, context: Context) => {
  // Only allow POST requests
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Get the API key from environment variable or use the default
    const apiKey = process.env.VITE_ULTRALYTICS_API_KEY || "5ea02b4238fc9528408b8c36dcdb3834e11a9cbf58";

    // Get the form data from the incoming request
    const formData = await request.formData();

    // Forward the request to Ultralytics API
    const response = await fetch("https://predict.ultralytics.com", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ultralytics API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Ultralytics API request failed",
          status: response.status,
          message: errorText
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error proxying to Ultralytics:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
