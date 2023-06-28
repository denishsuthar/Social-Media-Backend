import express from "express";
import { allUsers, deleteUser, findUser, followAndUnfollowUser, forgotPassword, login, logout, myProfile, register, resetPassword, updatePassword, updateProfile, updateRole, verifyEmail } from "../controller/userController.js";
import { isAdmin, isAuthenticatedUser } from "../middelware/auth.js";
import singleUpload from "../middelware/multer.js";


const router = express.Router();

router.route("/register").post(singleUpload,register)

router.route("/login").post(login)

router.route("/logout").get(logout)

router.route("/password/forgot").post(forgotPassword)

router.route("/password/reset/:token").put(resetPassword)

router.route("/me").get(isAuthenticatedUser,myProfile)

router.route("/me/update").put(isAuthenticatedUser, singleUpload, updateProfile)

router.route("/password/update").put(isAuthenticatedUser, updatePassword)

router.route("/verify/:token").get(verifyEmail)

router.route("/follow/:id").get(isAuthenticatedUser, followAndUnfollowUser)

router.route("/users").get(isAuthenticatedUser,allUsers)

router.route("/user/:id").delete(isAuthenticatedUser, isAdmin, deleteUser).get(isAuthenticatedUser, findUser).put(isAuthenticatedUser, isAdmin, updateRole)

export default router