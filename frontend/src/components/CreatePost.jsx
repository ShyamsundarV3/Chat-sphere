import { AddIcon } from "@chakra-ui/icons";
import {
    useColorModeValue,
    Button,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    FormControl,
    Textarea,
    Text,
    Image,
    Flex,
    CloseButton,
    Input
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import usePreviewImg from "../hooks/usePreviewImg";
import { BsFillImageFill } from "react-icons/bs";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import useShowToast from "../hooks/useShowToast";
import postsAtom from "../atoms/postsAtom";
import feedPostsAtom from "../atoms/feedPostsAtom";
import { useParams, useLocation } from "react-router-dom";

const MAX_CHAR = 500;

const CreatePost = () => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [postText, setPostText] = useState('');
    const [remainingChar, setRemainingChar] = useState(MAX_CHAR);
    const { handleImageChange, imgUrl, setImgUrl } = usePreviewImg(); 
    const imageRef = useRef(null);
    const user = useRecoilValue(userAtom);
    const showToast = useShowToast();
    const [loading, setLoading] = useState(false);
    const [posts, setPosts] = useRecoilState(postsAtom);
    const [feedPosts, setFeedPosts] = useRecoilState(feedPostsAtom);
    const { username } = useParams();
    const location = useLocation();

    const handleTextChange = (e) => {
        const inputText = e.target.value;

		if (inputText.length > MAX_CHAR) {
			const truncatedText = inputText.slice(0, MAX_CHAR);
			setPostText(truncatedText);
			setRemainingChar(0);
		} else {
			setPostText(inputText);
			setRemainingChar(MAX_CHAR - inputText.length);
		}
    };

    const handleCreatePost = async () => {
    if (!imgUrl && !postText.trim()) {
        showToast("Error", "Please add an image or caption", "error");
        return;
    }
        setLoading(true);
        try {
            const res = await fetch("/api/posts/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ postedBy: user._id, text: postText, img: imgUrl })
            });
            const data = await res.json();
            if (data.error) {
                showToast("Error", data.error, "error");
                return;
            }
            showToast("Success", "Post created successfully", "success");
            
            // If we are on our own profile page, update profile posts
            if (username === user.username) {
                setPosts([data, ...posts]);
            }
            // If we are on the homepage (feed), update feed posts
            if (location.pathname === "/") {
                setFeedPosts([data, ...feedPosts]);
            }

            onClose();
            setPostText("");
            setImgUrl("");
            setRemainingChar(MAX_CHAR);
        } catch (error) {
            showToast("Error", error.message || error, "error");
        } finally {
            setLoading(false);
        }
    };

   const isAllowedPage = location.pathname === "/" || location.pathname === `/${user?.username}`;

if (!isAllowedPage) return null;

return (
    <>
        <Button
            position={"fixed"}
            bottom={10}
            right={10}
            leftIcon={<AddIcon />}
            bg={useColorModeValue("gray.300", "gray.dark")}
            onClick={onOpen}
            size={{ base: "sm", sm: "md" }}
            zIndex={99}
        >
            Post
        </Button>
            
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent bg={"gray.dark"} color={"white"}>
                    <ModalHeader>Create Post</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <FormControl>
                            <Textarea 
                                placeholder='Post content goes here'
                                onChange={handleTextChange}
                                value={postText}
                                color={"white"}
                            />
                            <Text 
                                fontSize="xs"
                                fontWeight="bold"
                                textAlign={"right"}
                                m={"1"}
                                color={"gray.400"}
                            >
                                {remainingChar}/{MAX_CHAR}
                            </Text>
                            <Input
                                type="file"
                                hidden 
                                ref={imageRef}
                                onChange={handleImageChange}
                            />
                            <BsFillImageFill
                                style={{ marginLeft: "5px", cursor: "pointer" }}
                                size={16}
                                onClick={() => imageRef.current.click()}
                            />
                        </FormControl>

                        {imgUrl && (
                            <Flex mt={5} w={"full"} position={"relative"}>
                                <Image src={imgUrl} alt='Selected img' borderRadius={6} />
                                <CloseButton
                                    onClick={() => {
                                        setImgUrl("");
                                    }}
                                    bg={"gray.800"}
                                    position={"absolute"}
                                    top={2}
                                    right={2}
                                />
                            </Flex>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme='blue' mr={3} onClick={handleCreatePost} isLoading={loading}>
                            Post
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};

export default CreatePost;
