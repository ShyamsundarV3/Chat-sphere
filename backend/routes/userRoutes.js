import express from "express";
import { signupUser, loginUser, logoutUser, followUnFollowUser, updateUser, getUserProfile, getSuggestedUsers, searchUsers, getUsersByIds } from '../controllers/userController.js';
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

router.get("/suggested", protectRoute, getSuggestedUsers);
router.get("/search", protectRoute, searchUsers);
router.get("/profile/:query", getUserProfile);
router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/follow/:id", protectRoute, followUnFollowUser);
router.post("/batch", protectRoute, getUsersByIds);
router.put("/update/:id", protectRoute, updateUser);

export default router;
