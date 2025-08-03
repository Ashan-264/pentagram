import React, { useState, useEffect } from "react";
import {
  Card,
  CardMedia,
  CardActions,
  IconButton,
  Typography,
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import CommentIcon from "@mui/icons-material/Comment";
import PublicIcon from "@mui/icons-material/Public";
import LockIcon from "@mui/icons-material/Lock";
import { CircularProgress } from "@mui/material";

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  users: {
    username: string;
    name: string;
  };
}

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

interface ImageCardProps {
  image: ImageData;
  index: number;
  onDelete: (imageId: string) => void;
  deleting: string | null;
  onPrivacyChange: (imageId: string, isPublic: boolean) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  index,
  onDelete,
  deleting,
  onPrivacyChange,
}) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(image.likeCount);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);

  // Mock user ID (in production, get from Clerk auth)
  const userId = "620dbb20-0cea-4982-bc3a-3733695b76c2"; // Use the system user ID for now
  const username = "User" + Math.floor(Math.random() * 1000);

  useEffect(() => {
    fetchLikes();
    fetchComments();
  }, [image.id]);

  const fetchLikes = async () => {
    try {
      const response = await fetch(
        `/api/likes?imageId=${encodeURIComponent(image.id)}&userId=${encodeURIComponent(userId)}`
      );
      if (response.ok) {
        const data = await response.json();
        setLikeCount(data.count);
        setLiked(data.userHasLiked);
      }
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `/api/comments?imageId=${encodeURIComponent(image.id)}`
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleLike = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_id: image.id, user_id: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setLiked(data.liked);
        setLikeCount(data.count);
      }
    } catch (error) {
      console.error("Error handling like:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_id: image.id,
          user_id: userId,
          comment_text: newComment.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [...prev, data.comment]);
        setNewComment("");
        setCommentDialogOpen(false);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setCommentLoading(false);
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const handlePrivacyToggle = async () => {
    setPrivacyLoading(true);
    try {
      const response = await fetch("/api/images", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: image.id,
          is_public: !image.is_public,
        }),
      });

      if (response.ok) {
        onPrivacyChange(image.id, !image.is_public);
      } else {
        console.error("Failed to update privacy setting");
      }
    } catch (error) {
      console.error("Error updating privacy:", error);
    } finally {
      setPrivacyLoading(false);
    }
  };

  return (
    <>
      <Card sx={{ maxWidth: "100%", position: "relative" }}>
        <CardMedia
          component="img"
          image={image.downloadUrl}
          alt={`Image ${index + 1}`}
          sx={{
            height: 300,
            width: "100%",
            objectFit: "cover",
          }}
        />
        <CardActions sx={{ justifyContent: "space-between", p: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              onClick={handleLike}
              disabled={loading}
              color={liked ? "error" : "default"}
              size="small"
            >
              {loading ? (
                <CircularProgress size={20} />
              ) : liked ? (
                <FavoriteIcon />
              ) : (
                <FavoriteBorderIcon />
              )}
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {likeCount}
            </Typography>
            <IconButton onClick={() => setCommentDialogOpen(true)} size="small">
              <CommentIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {comments.length}
            </Typography>
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {/* Privacy Toggle */}
            <Tooltip title={image.is_public ? "Make Private" : "Make Public"}>
              <IconButton
                onClick={handlePrivacyToggle}
                disabled={privacyLoading}
                color={image.is_public ? "primary" : "default"}
                size="small"
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 1)",
                  },
                }}
              >
                {privacyLoading ? (
                  <CircularProgress size={20} />
                ) : image.is_public ? (
                  <PublicIcon />
                ) : (
                  <LockIcon />
                )}
              </IconButton>
            </Tooltip>
            
            {/* Delete Button */}
            <IconButton
              onClick={() => onDelete(image.id)}
              disabled={deleting === image.id}
              color="error"
              size="small"
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 1)",
                },
              }}
            >
              {deleting === image.id ? (
                <CircularProgress size={20} />
              ) : (
                <DeleteIcon />
              )}
            </IconButton>
          </Box>
        </CardActions>
      </Card>

      {/* Comments Dialog */}
      <Dialog
        open={commentDialogOpen}
        onClose={() => setCommentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Comments ({comments.length})</DialogTitle>
        <DialogContent>
          <List sx={{ maxHeight: 300, overflow: "auto" }}>
            {comments.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="No comments yet"
                  secondary="Be the first to comment!"
                />
              </ListItem>
            ) : (
              comments.map(comment => (
                <React.Fragment key={comment.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Chip
                            label={comment.users.username}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(comment.created_at)}
                          </Typography>
                        </Box>
                      }
                      secondary={comment.comment_text}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))
            )}
          </List>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Add a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              disabled={commentLoading}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim() || commentLoading}
            variant="contained"
          >
            {commentLoading ? "Adding..." : "Add Comment"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ImageCard;
