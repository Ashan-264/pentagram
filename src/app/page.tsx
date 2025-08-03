"use client";

import { useState, useEffect } from "react";
//import { generateImage } from "./actions/generateImage";
import Gallery from "./components/Gallery";
import Menu from "./components/Menu";
import * as dropin from "braintree-web-drop-in";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // const [imageURL, setImageURL] = useState<string | null>(null);
  const [galleryTrigger, setGalleryTrigger] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [dropinInstance, setDropinInstance] = useState<dropin.Dropin | null>(
    null
  );
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDarkMode(savedTheme === "dark");
    }
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
    const newTheme = !isDarkMode ? "dark" : "light";
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", !isDarkMode);
  };

  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    switch (option) {
      case "Realistic":
        setSelectedOption(
          "Realism Focus: Photorealistic depictions of everyday life, people, landscapes, or objects."
        );
        break;
      case "Fantasy/ Surreal":
        setSelectedOption(
          "Fantasy/Surrealism Focus: Imaginative, otherworldly visuals, blending reality with dreamlike elements."
        );
        break;
      case "Animated":
        setSelectedOption(
          "Japanese Manga with as little female characters as possible Focus: featuring stylized characters in fantastical or imaginative settings. Ensure all characters are fully clothed and depicted in modest, family-friendly attire and poses. If gender is not specified, default to designing a male character. Avoid excessive violence, suggestive themes, or any depictions that would exceed PG-13 standards."
        );
        break;
      case "Abstract":
        setSelectedOption(
          "Abstract Focus: Non-representational, focusing on shapes, colors, and forms instead of realism."
        );
        break;
      default:
        setSelectedOption("");
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification(null);
    const response = await fetch("/api/groq-moderator", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: inputText,
      }),
    });
    const data = await response.json();
    const safeGuard = data.result;

    try {
      if (safeGuard.toLowerCase() != "safe") {
        throw new Error(`Message contains unsafe content: ${safeGuard} `);
      }
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText + ` photo description -> ${selectedOption}`,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to generate image HTTP error, status: ${response.status}`
        );
      }
      const data = await response.json();
      console.log("", data);
      if (!data.success) {
        throw new Error(data.error || "Failed to generate image");
      }

      if (data.imageURL) {
        const img = new Image();
        img.onload = () => {
          //setImageURL(data.imageURL);
          setGalleryTrigger(prev => prev + 1);
        };
        img.src = data.imageURL;
      }
      console.log(data);
      setInputText("");
    } catch (error) {
      console.error("Error:", error);
      setNotification((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  async function fetchClientToken(): Promise<string> {
    const response = await fetch("/api/client_token");
    if (!response.ok) {
      throw new Error("Failed to fetch client token");
    }
    const data = await response.json();
    if (!data.clientToken) {
      throw new Error("Client token not found in response");
    }
    return data.clientToken;
  }

  // Example: Get the client token from your backend (replace with your actual token)

  // Initialize the Drop-in UI
  useEffect(() => {
    const initializeDropin = async () => {
      try {
        const clientToken = await fetchClientToken();
        const instance = await dropin.create({
          authorization: clientToken,
          container: "#dropin-container",
          paypal: {
            flow: "checkout",
            amount: "1.005",
            currency: "USD",
          },
          venmo: {
            allowNewBrowserTab: true,
          },
          card: {
            vault: {
              allowVaultCardOverride: true,
            },
            cardholderName: {
              required: true,
            },
          },
          googlePay: process.env.NEXT_PUBLIC_GOOGLE_MERCHANT_ID
            ? {
                googlePayVersion: 2,
                merchantId: process.env.NEXT_PUBLIC_GOOGLE_MERCHANT_ID,
                transactionInfo: {
                  totalPriceStatus: "FINAL",
                  totalPrice: "10.00",
                  currencyCode: "USD",
                },
              }
            : undefined,
          applePay: {
            displayName: "Your Store Name",
            paymentRequest: {
              total: {
                label: "Total",
                amount: "10.00",
              },
              countryCode: "US",
              currencyCode: "USD",
              supportedNetworks: ["visa", "masterCard", "amex"],
              merchantCapabilities: ["supports3DS"],
              requiredBillingContactFields: ["postalAddress"],
            },
          },
        });
        setDropinInstance(instance);
      } catch (err) {
        console.error("Error initializing Drop-in:", err);
      }
    };

    initializeDropin();

    // Cleanup on unmount
    return () => {
      if (dropinInstance) {
        dropinInstance.teardown();
      }
    };
  }, []);

  const handlePayment = async () => {
    if (!dropinInstance) {
      console.error("Drop-in instance not initialized");
      return;
    }

    setPaymentLoading(true);
    try {
      const payload = await dropinInstance.requestPaymentMethod();
      // Send the nonce to your server
      const response = await fetch("/api/process-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethodNonce: payload.nonce,
          amount: "1.00",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Payment failed");
      }

      // Payment successful
      setNotification("Payment successful!");
      // You might want to redirect or update UI here
    } catch (err) {
      console.error("Error processing payment:", err);
      setNotification(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between p-8 ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-black"}`}
    >
      {/* Payment section */}
      <div className="w-full max-w-md mx-auto my-8 p-6 rounded-lg border dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-4">Payment</h2>
        <div id="dropin-container" className="mb-4"></div>
        <button
          onClick={handlePayment}
          disabled={!dropinInstance || paymentLoading}
          className="w-full px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {paymentLoading ? "Processing..." : "Complete Purchase"}
        </button>
      </div>

      {notification && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded shadow-lg">
          {notification}
        </div>
      )}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded bg-blue-600 text-white"
      >
        Toggle {isDarkMode ? "Light" : "Dark"} Mode
      </button>
      <Menu onSelectOption={handleSelectOption} />
      <main className="flex-1 mt-8">
        <Gallery trigger={galleryTrigger} />
      </main>
      <></>
      {/* {imageURL && (
        <div className="w-full max-w-2xl rounded-lg overflow-hidden shadow-lg">
          <img
            src={imageURL}
            alt="Generated artwork"
            className="w-full h-auto"
          />
        </div>
      )} */}
      <footer className="w-full max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="flex-1 p-3 rounded-lg bg-black/[.05] dark:bg-white/[.06] border border-black/[.08] dark:border-white/[.145] focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              placeholder="Describe the image you want to generate..."
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-lg bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors disabled:opacity-50"
            >
              {isLoading ? "Generating..." : "Generate"}
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}
//  return <ImageGenerator generateImage={generateImage}/>
