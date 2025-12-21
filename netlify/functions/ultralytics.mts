import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Get API key from environment variable or use fallback
    const apiKey = Netlify.env.get("VITE_ULTRALYTICS_API_KEY") || "5ea02b4238fc9528408b8c36dcdb3834e11a9cbf58";

    // Forward the request body as-is (multipart/form-data)
    const formData = await req.formData();

    // Forward request to Ultralytics API
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
        JSON.stringify({ error: "Ultralytics API error", details: errorText }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const config: Config = {
  path: "/api/ultralytics",
};
