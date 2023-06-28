import express from "express";
import { isAdmin, isAuthenticatedUser } from "../middelware/auth.js";
import { commentOnPost, allPosts, createPost, deletePost, getPostOfFollowing, likeAndUnlikePost, myPosts, updatePost, viewPost, deleteComment, deletePostAdmin } from "../controller/postController.js";
import singleUpload from "../middelware/multer.js";

const router = express.Router();

router.route("/post/new").post(isAuthenticatedUser, singleUpload, createPost)

router.route("/posts").get(allPosts)

router.route("/mypost").get(isAuthenticatedUser, myPosts)

router.route("/post/view/:id").get(viewPost)

router.route("/post/:id").delete(isAuthenticatedUser, deletePost).get(isAuthenticatedUser, likeAndUnlikePost).put(isAuthenticatedUser, singleUpload, updatePost)

router.route("/posts/following").get(isAuthenticatedUser, getPostOfFollowing)

router.route("/post/comment/:id").put(isAuthenticatedUser, commentOnPost).delete(isAuthenticatedUser, deleteComment)


// Admin Route

router.route("/post/delete/:id").delete(isAuthenticatedUser, isAdmin, deletePostAdmin)



export default router