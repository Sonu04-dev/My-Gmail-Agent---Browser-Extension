// Background script for API communication
// This script handles API calls to bypass CORS restrictions

const BASE_URL = "http://localhost:8080/api/v1/agent";

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background script received message:", request.action);
  
  if (request.action === "generateReply") {
    generateReply(request.emailData, request.tone)
      .then((reply) => {
        console.log("Reply generated successfully");
        sendResponse({ success: true, reply });
      })
      .catch((error) => {
        console.error("Error generating reply:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  }
});

async function generateReply(emailData, tone) {
  try {
    console.log("Starting API call...");
    console.log("Base URL:", BASE_URL);
    console.log("Tone:", tone);
    console.log("Email subject length:", emailData.subject.length);
    console.log("Email content length:", emailData.content.length);
    
    const url = `${BASE_URL}/reply?tone=${encodeURIComponent(tone)}`;
    console.log("Full URL:", url);

    const requestBody = {
      subject: emailData.subject,
      content: emailData.content,
      fromAddress: "",
      toAddress: "",
    };
    
    console.log("Request body:", JSON.stringify(requestBody).substring(0, 200) + "...");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("API Response received");
    console.log("Response status:", response.status);
    console.log("Response status text:", response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status;
      
      console.error("API returned error:", status, errorText);

      if (status === 429) {
        throw new Error("API rate limit exceeded. Please try again later.");
      } else if (status === 400) {
        throw new Error(
          "Invalid email content. Please ensure the email has both subject and content."
        );
      } else if (status === 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(`API error (${status}): ${errorText}`);
      }
    }

    const reply = await response.text();
    console.log("Reply received, length:", reply.length);
    
    if (!reply) {
      throw new Error("Received empty reply from API.");
    }

    return reply;
  } catch (error) {
    console.error("Background API call error:", error.message);
    console.error("Error type:", error.constructor.name);
    console.error("Full error:", error);
    
    // Add helpful diagnostic message
    if (error.message === "Failed to fetch") {
      throw new Error(
        "Failed to connect to backend. Make sure the backend server is running on http://localhost:8080"
      );
    }
    
    throw error;
  }
}
