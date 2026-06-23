import { atom } from "recoil";

const feedPostsAtom = atom({
	key: "feedPostsAtom",
	default: [],
});

export default feedPostsAtom;
