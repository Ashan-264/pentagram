"use client";

import { useState, useEffect } from "react";
//import { generateImage } from "./actions/generateImage";
import Gallery from "./components/Gallery";
import Menu from "./components/Menu";
import * as dropin from "braintree-web-drop-in";
//import { useUser, useAuth } from "@clerk/nextjs";

// Type for Apple Pay
interface WindowWithApplePay extends Window {
  ApplePaySession?: {
    canMakePayments(): boolean;
  };
}

export default function Home() {
  //const { user, isLoaded } = useUser();
  //const { getToken } = useAuth();
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [galleryTrigger, setGalleryTrigger] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [dropinInstance, setDropinInstance] = useState<dropin.Dropin | null>(
    null
  );
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isPaymentVisible, setIsPaymentVisible] = useState(false); // Payment box hidden by default

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

    if (!inputText.trim()) {
      setNotification("Please enter a description for your image.");
      return;
    }

    setIsLoading(true);
    setNotification(null);

    try {
      // Content moderation check
      const moderationResponse = await fetch("/api/groq-moderator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText,
        }),
      });

      if (!moderationResponse.ok) {
        throw new Error("Failed to check content safety. Please try again.");
      }

      const moderationData = await moderationResponse.json();
      const safeGuard = moderationData.result;

      if (safeGuard.toLowerCase() !== "safe") {
        throw new Error(`Content contains unsafe material: ${safeGuard}`);
      }

      // Generate image
      const imageResponse = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText + ` photo description -> ${selectedOption}`,
        }),
      });

      if (!imageResponse.ok) {
        throw new Error(
          `Failed to generate image: ${imageResponse.status} ${imageResponse.statusText}`
        );
      }

      const imageData = await imageResponse.json();

      if (!imageData.success) {
        throw new Error(imageData.error || "Failed to generate image");
      }

      if (imageData.imageURL) {
        const img = new Image();
        img.onload = () => {
          setGalleryTrigger(prev => prev + 1);
          setNotification("Image generated successfully!");
        };
        img.onerror = () => {
          setNotification(
            "Generated image could not be loaded. Please try again."
          );
        };
        img.src = imageData.imageURL;
      }

      setInputText("");
    } catch (error) {
      console.error("Error generating image:", error);
      setNotification((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClientToken = async (): Promise<string> => {
    try {
      const response = await fetch("/api/client_token");
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Client token API error:", errorData);
        throw new Error(
          errorData.details ||
            `Failed to fetch client token: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();
      if (!data.clientToken) {
        throw new Error("Client token not found in response");
      }
      return data.clientToken;
    } catch (error) {
      console.error("Error fetching client token:", error);

      // Show specific error message if it's a configuration issue
      if (
        error instanceof Error &&
        error.message.includes("Braintree credentials")
      ) {
        throw new Error(
          "Payment system not configured. Please check Braintree credentials in environment variables."
        );
      }

      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to initialize payment system. Please try again later."
      );
    }
  };

  // Initialize the Drop-in UI
  useEffect(() => {
    let instance: dropin.Dropin | null = null;
    let isInitializing = false;

    // Add global error handler for Braintree popup issues
    const handleGlobalErrors = (event: ErrorEvent) => {
      if (
        event.message &&
        (event.message.includes("close") ||
          event.message.includes("popup") ||
          event.message.includes("focus") ||
          event.message.includes("fn.apply") ||
          event.message.includes("amplitude.com"))
      ) {
        console.warn("Prevented Braintree error:", event.message);
        event.preventDefault();
        return false;
      }
    };

    // Add unhandled rejection handler for promise-based errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason &&
        typeof event.reason === "object" &&
        (event.reason.message?.includes("close") ||
          event.reason.message?.includes("popup") ||
          event.reason.message?.includes("focus") ||
          event.reason.message?.includes("fn.apply") ||
          event.reason.message?.includes("amplitude.com") ||
          event.reason.name === "DropinError")
      ) {
        console.warn("Prevented Braintree promise rejection:", event.reason);
        event.preventDefault();
      }
    };

    const initializeDropin = async () => {
      // Prevent multiple simultaneous initializations
      if (isInitializing) {
        console.warn("Drop-in initialization already in progress");
        return;
      }

      isInitializing = true;

      // Declare outside try block so it's accessible in catch
      let originalWindowOpen: typeof window.open = window.open;
      const originalFetch: typeof window.fetch = window.fetch;

      try {
        // Add global error listeners before initializing
        window.addEventListener("error", handleGlobalErrors);
        window.addEventListener("unhandledrejection", handleUnhandledRejection);

        // Clean up any existing instance first
        if (dropinInstance) {
          await dropinInstance.teardown();
          setDropinInstance(null);
        }

        // Ensure container is completely empty before initialization
        const container = document.getElementById("dropin-container");
        if (container) {
          // Clear all content from container
          container.innerHTML = "";
          // Remove any existing classes that might interfere
          container.className = "";
          // Ensure container is ready for new content
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          throw new Error(
            "Payment container not found. Please refresh the page."
          );
        }

        const clientToken = await fetchClientToken();

        // Add protection for Braintree's internal calls
        originalWindowOpen = window.open;
        window.open = function (...args) {
          const popup = originalWindowOpen.apply(this, args);
          if (popup) {
            // Ensure close method exists and is safe to call
            const originalClose = popup.close;
            popup.close = function () {
              try {
                if (originalClose && typeof originalClose === "function") {
                  originalClose.call(this);
                }
              } catch (error) {
                console.warn("Prevented popup close error:", error);
              }
            };

            // Prevent focus errors on popup
            const originalFocus = popup.focus;
            popup.focus = function () {
              try {
                if (originalFocus && typeof originalFocus === "function") {
                  originalFocus.call(this);
                }
              } catch (error) {
                console.warn("Prevented popup focus error:", error);
              }
            };
          }
          return popup;
        };

        // Suppress analytics errors by intercepting fetch requests to amplitude
        const originalFetch = window.fetch;
        window.fetch = function (input, init) {
          if (typeof input === "string" && input.includes("amplitude.com")) {
            console.warn("Suppressed analytics request to:", input);
            return Promise.resolve(new Response("{}", { status: 200 }));
          }
          return originalFetch.call(this, input, init);
        };

        instance = (await dropin.create({
          authorization: clientToken,
          container: "#dropin-container",
          // Enhanced styling and UX options
          locale: "en_US",
          translations: {
            payWithCard: "Pay with Credit/Debit Card",
            chooseAnotherWayToPay: "Choose another payment method",
          },
          // PayPal configuration
          paypal: {
            flow: "checkout",
            amount: "10.00",
            currency: "USD",
            buttonStyle: {
              color: "gold",
              shape: "rect",
              size: "responsive",
            } as Record<string, string>,
          },
          // PayPal Credit (Pay Later)
          paypalCredit: {
            flow: "checkout",
            amount: "10.00",
            currency: "USD",
          },
          // Venmo configuration (enhanced for sandbox with better error handling)
          // Note: Set DISABLE_VENMO=true in .env.local if popup errors persist
          ...(process.env.DISABLE_VENMO !== "true" && {
            venmo: {
              allowNewBrowserTab: false, // Required for sandbox
              ...(process.env.NODE_ENV === "development" && {
                allowDesktopWebLogin: true, // Sandbox-specific
                profileId: null, // Don't require profile ID in sandbox
              }),

              // Add additional sandbox-specific configurations
              ...(process.env.NODE_ENV === "development" && {
                ignoreHistoryChanges: true, // Prevent navigation issues
              }),
            },
          }),
          // Enhanced card configuration
          card: {
            overrides: {
              styles: {
                input: {
                  "font-size": "16px",
                  "font-family": "system-ui, sans-serif",
                },
                ".invalid": {
                  color: "#E53E3E",
                },
                ".valid": {
                  color: "#38A169",
                },
              },
              fields: {
                number: {
                  placeholder: "4111 1111 1111 1111",
                },
                cvv: {
                  placeholder: "123",
                },
                expirationDate: {
                  placeholder: "MM/YY",
                },
              },
            },
            vault: {
              allowVaultCardOverride: true,
            },
            cardholderName: {
              required: true,
            },
          },
          // Google Pay (only if merchant ID is available)
          ...(process.env.NEXT_PUBLIC_GOOGLE_MERCHANT_ID && {
            googlePay: {
              googlePayVersion: 2,
              merchantId: process.env.NEXT_PUBLIC_GOOGLE_MERCHANT_ID,
              transactionInfo: {
                totalPriceStatus: "FINAL",
                totalPrice: "10.00",
                currencyCode: "USD",
              },
            },
          }),
          // Apple Pay (only if supported)
          ...(typeof window !== "undefined" &&
            typeof (window as WindowWithApplePay).ApplePaySession !==
              "undefined" &&
            (
              window as WindowWithApplePay
            ).ApplePaySession?.canMakePayments() && {
              applePay: {
                displayName: "Pentagram Store",
                paymentRequest: {
                  total: {
                    label: "Image Generation Service",
                    amount: "10.00",
                  },
                  countryCode: "US",
                  currencyCode: "USD",
                  supportedNetworks: ["visa", "masterCard", "amex", "discover"],
                  merchantCapabilities: ["supports3DS"],
                  requiredBillingContactFields: ["postalAddress"],
                  requiredShippingContactFields: [],
                },
              },
            }),
          // 3D Secure configuration
          threeDSecure: {
            amount: "10.00",
          },
        })) as unknown as dropin.Dropin;
        setDropinInstance(instance);

        // Restore original functions after initialization
        window.open = originalWindowOpen;
        window.fetch = originalFetch;
      } catch (err) {
        console.error("Error initializing Drop-in:", err);

        // Remove error listeners if initialization fails
        window.removeEventListener("error", handleGlobalErrors);
        window.removeEventListener(
          "unhandledrejection",
          handleUnhandledRejection
        );

        // Restore original functions on error
        if (typeof originalWindowOpen !== "undefined") {
          window.open = originalWindowOpen;
        }
        if (typeof originalFetch !== "undefined") {
          window.fetch = originalFetch;
        }

        setNotification(
          "Failed to initialize payment system. Please try again."
        );
      } finally {
        isInitializing = false;
      }
    };

    // Only initialize if container exists and payment is visible
    const container = document.getElementById("dropin-container");
    if (container && isPaymentVisible) {
      // Wait a bit to ensure DOM is fully ready and avoid double initialization
      const timeoutId = setTimeout(() => {
        if (!isInitializing && !dropinInstance) {
          initializeDropin();
        }
      }, 200);

      // Return cleanup function that cancels the timeout if component unmounts quickly
      return () => {
        clearTimeout(timeoutId);
        isInitializing = false;

        // Remove global error listeners
        window.removeEventListener("error", handleGlobalErrors);
        window.removeEventListener(
          "unhandledrejection",
          handleUnhandledRejection
        );

        if (instance) {
          instance.teardown().catch((error: Error | unknown) => {
            // Ignore teardown errors - they're expected in some cases
            console.warn("Drop-in teardown warning:", error);
          });
        }

        // Clear container on cleanup
        const container = document.getElementById("dropin-container");
        if (container) {
          container.innerHTML = "";
        }
      };
    }

    // Fallback cleanup if no container found
    return () => {
      isInitializing = false;

      // Remove global error listeners
      window.removeEventListener("error", handleGlobalErrors);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );

      if (instance) {
        instance.teardown().catch((error: Error | unknown) => {
          // Ignore teardown errors - they're expected in some cases
          console.warn("Drop-in teardown warning:", error);
        });
      }

      // Clear container on cleanup
      const container = document.getElementById("dropin-container");
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [isPaymentVisible, dropinInstance]); // Re-run when payment visibility changes

  const handlePayment = async () => {
    if (!dropinInstance) {
      setNotification(
        "Payment system not ready. Please wait a moment and try again."
      );
      return;
    }

    setPaymentLoading(true);
    setNotification(null);

    try {
      // Add extra safety for payment method request
      let payload;
      try {
        payload = await dropinInstance.requestPaymentMethod();
      } catch (dropinError) {
        console.warn("Drop-in payment method error:", dropinError);
        throw new Error("Payment method selection failed. Please try again.");
      }

      if (!payload || !payload.nonce) {
        throw new Error("Invalid payment method. Please try again.");
      }

      // Handle Venmo-specific issues
      if (payload.type === "VenmoAccount" && !payload.nonce) {
        throw new Error(
          "Venmo payment was not completed. Please try again or use a different payment method."
        );
      }

      // Additional validation for 3D Secure (only for credit cards)
      if (
        payload.type === "CreditCard" &&
        "liabilityShifted" in payload &&
        payload.liabilityShifted === false
      ) {
        console.warn(
          "3D Secure authentication was attempted but did not complete"
        );
      }

      // Send the nonce to your server with enhanced data
      const response = await fetch("/api/process-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethodNonce: payload.nonce,
          amount: "10.00",
          paymentMethodType: payload.type,
          deviceData: payload.deviceData || null, // For fraud protection
          // Include 3D Secure info if available (only for credit cards)
          ...(payload.type === "CreditCard" &&
            "threeDSecureInfo" in payload &&
            payload.threeDSecureInfo && {
              threeDSecureInfo: {
                liabilityShifted: (
                  payload as unknown as Record<string, unknown>
                ).liabilityShifted,
                liabilityShiftPossible: (
                  payload as unknown as Record<string, unknown>
                ).liabilityShiftPossible,
              },
            }),
          // Include card details if available (for receipts)
          ...(payload.details &&
            "cardType" in payload.details && {
              paymentDetails: {
                cardType: (
                  payload.details as unknown as Record<string, unknown>
                ).cardType,
                lastTwo:
                  (payload.details as unknown as Record<string, unknown>)
                    .lastTwo ||
                  (payload.details as unknown as Record<string, unknown>)
                    .dpanLastTwo,
                lastFour: (
                  payload.details as unknown as Record<string, unknown>
                ).lastFour,
              },
            }),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `Payment failed with status ${response.status}`
        );
      }

      // Payment successful
      const successMessage = `Payment successful! Thank you for your purchase. ${
        payload.type === "PayPalAccount"
          ? "Paid with PayPal"
          : payload.type === "VenmoAccount"
            ? "Paid with Venmo"
            : payload.type === "AndroidPayCard"
              ? "Paid with Google Pay"
              : payload.type === "ApplePayCard"
                ? "Paid with Apple Pay"
                : "Paid with Card"
      }.`;

      setNotification(successMessage);

      // Clear the payment method selection with extra safety
      if (dropinInstance) {
        try {
          // Check if the method exists before calling it
          if (typeof dropinInstance.clearSelectedPaymentMethod === "function") {
            dropinInstance.clearSelectedPaymentMethod();
          }
        } catch (clearError) {
          console.warn("Could not clear payment method:", clearError);
          // Ignore clear errors - they're not critical
        }
      }
    } catch (err) {
      console.error("Error processing payment:", err);

      // Handle specific Venmo errors
      let errorMessage = "Payment failed. Please try again.";
      if (err instanceof Error) {
        if (err.message.includes("User did not complete")) {
          errorMessage = "Payment was cancelled. Please try again when ready.";
        } else if (
          err.message.includes("popup") ||
          err.message.includes("close")
        ) {
          errorMessage =
            "Payment window issue. Please try again or use a different payment method.";
        } else {
          errorMessage = err.message;
        }
      }

      setNotification(errorMessage);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between p-8 ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-black"}`}
    >
      {/* Payment toggle button */}
      <div className="w-full max-w-md mx-auto my-4">
        <button
          onClick={() => setIsPaymentVisible(!isPaymentVisible)}
          className="w-full px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          type="button"
        >
          <span>💳</span>
          {isPaymentVisible ? "Hide Donation Options" : "Show Donation Options"}
          <span
            className="transform transition-transform duration-200"
            style={{
              transform: isPaymentVisible ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </button>
      </div>

      {/* Payment section */}
      {isPaymentVisible && (
        <div className="w-full max-w-md mx-auto my-8 p-6 rounded-lg border dark:border-gray-700 border-gray-300 animate-fadeIn">
          <h2 className="text-2xl font-bold mb-4">Donation ($10.00)</h2>
          <div
            id="dropin-container"
            className="mb-4 min-h-[300px] border rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
            style={{
              // Ensure proper styling for the drop-in
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          ></div>
          <button
            onClick={handlePayment}
            disabled={!dropinInstance || paymentLoading}
            className="w-full px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            {paymentLoading
              ? "Processing Payment..."
              : "Complete Donation ($10.00)"}
          </button>
          {!dropinInstance && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Initializing payment system...
            </p>
          )}
        </div>
      )}

      {notification && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded shadow-lg max-w-sm ${
            notification.includes("successful") ? "bg-green-500" : "bg-red-500"
          } text-white`}
        >
          <div className="flex justify-between items-start">
            <span>{notification}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-white hover:text-gray-200"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
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
