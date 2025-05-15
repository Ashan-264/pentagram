"use client";

import { useState, useEffect } from "react";
//import { generateImage } from "./actions/generateImage";
import Gallery from "./components/Gallery";
import Menu from "./components/Menu";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // const [imageURL, setImageURL] = useState<string | null>(null);
  const [galleryTrigger, setGalleryTrigger] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);

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

  return (
    <div
      className={`min-h-screen flex flex-col justify-between p-8 ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-black"}`}
    >
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
