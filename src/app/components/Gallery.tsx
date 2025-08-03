import React, { useEffect, useState } from "react";
import {
  Container,
  Grid,
  CircularProgress,
  Typography,
  Tabs,
  Tab,
  Box,
} from "@mui/material";
import ImageCard from "./ImageCard";

interface ImageData {
  id: string;
  blob_name: string;
  downloadUrl: string;
  imageURL: string;
  likeCount: number;
  commentCount: number;
  is_public: boolean;
  users: {
    username: string;
    name: string;
  };
}

type TabValue = "all" | "public" | "private";

const Gallery: React.FC<{ trigger: number }> = ({ trigger }) => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<TabValue>("all");
  const [allImages, setAllImages] = useState<ImageData[]>([]); // Store all images

  useEffect(() => {
    const fetchImages = async () => {
      try {
        // Fetch all images (including private ones)
        const response = await fetch("/api/get-images?includePrivate=true", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(
            `Failed to fetch images HTTP error, status: ${response.status}`
          );
        }
        const data = await response.json();
        console.log("Fetched images:", data);
        setAllImages(data.images);
        filterImagesByTab("all", data.images);
      } catch (error) {
        console.error("Error fetching images:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [trigger]);

  const filterImagesByTab = (
    tab: TabValue,
    imageList: ImageData[] = allImages
  ) => {
    let filteredImages: ImageData[];

    switch (tab) {
      case "public":
        filteredImages = imageList.filter(img => img.is_public);
        break;
      case "private":
        filteredImages = imageList.filter(img => !img.is_public);
        break;
      case "all":
      default:
        filteredImages = imageList;
        break;
    }

    setImages(filteredImages);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: TabValue) => {
    setCurrentTab(newValue);
    filterImagesByTab(newValue);
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) {
      return;
    }

    setDeleting(imageId);
    try {
      const response = await fetch("/api/delete-image", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId: imageId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      // Remove the image from both all images and current filtered images
      setAllImages(prevImages => prevImages.filter(img => img.id !== imageId));
      setImages(prevImages => prevImages.filter(img => img.id !== imageId));
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Failed to delete image. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Container>
    );
  }

  const handlePrivacyChange = (imageId: string, isPublic: boolean) => {
    // Update both allImages and current filtered images
    const updateImages = (prevImages: ImageData[]) =>
      prevImages.map(img =>
        img.id === imageId ? { ...img, is_public: isPublic } : img
      );

    setAllImages(updateImages);
    setImages(updateImages);
  };

  return (
    <Container maxWidth="lg" sx={{ mb: 10 }}>
      {/* Tabs for filtering */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="image filter tabs"
        >
          <Tab label={`All (${allImages.length})`} value="all" />
          <Tab
            label={`Public (${allImages.filter(img => img.is_public).length})`}
            value="public"
          />
          <Tab
            label={`Private (${allImages.filter(img => !img.is_public).length})`}
            value="private"
          />
        </Tabs>
      </Box>

      <Grid container spacing={2}>
        {images.length === 0 ? (
          <Typography
            variant="h6"
            sx={{ textAlign: "center", width: "100%", mt: 4 }}
          >
            {currentTab === "all"
              ? "No images found."
              : `No ${currentTab} images found.`}
          </Typography>
        ) : (
          images.map((image, idx) => (
            <Grid item xs={12} sm={6} md={4} key={image.id}>
              <ImageCard
                image={image}
                index={idx}
                onDelete={handleDelete}
                deleting={deleting}
                onPrivacyChange={handlePrivacyChange}
              />
            </Grid>
          ))
        )}
      </Grid>
    </Container>
  );
};

export default Gallery;
