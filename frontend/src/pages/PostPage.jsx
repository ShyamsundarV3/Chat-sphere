import { Text, Flex, Box, Divider, Avatar, Image, Button, Spinner } from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import Actions from "../components/Actions";
import { useEffect } from 'react';
import Comment from "../components/Comment";
import useGetUserProfile from "../hooks/useGetUserProfile";
import useShowToast from "../hooks/useShowToast";
import { useParams, useNavigate } from "react-router-dom";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { formatDistanceToNow } from "date-fns";
import postsAtom from "../atoms/postsAtom";

const PostPage = () => {
  const { user, loading } = useGetUserProfile();
  const [posts, setPosts] = useRecoilState(postsAtom);
  const showToast = useShowToast();
  const { pid } = useParams();
  const currentUser = useRecoilValue(userAtom);
  const navigate = useNavigate();

  const currentPost = posts[0];

  useEffect(() => {
    const getPost = async () => {
      setPosts([]);
      try {
        const res = await fetch(`/api/posts/${pid}`);
        const data = await res.json();
        if (data.error) {
          showToast("Error", data.error, "error");
          return;
        }
        setPosts([data]);
      } catch (error) {
        showToast("Error", error.message, "error");
      }
    };
    if (pid) {
      getPost();
    }
  }, [showToast, pid, setPosts]);

  const handleDeletePost = async () => {
		try {
			if (!window.confirm("Are you sure you want to delete this post?")) return;

			const res = await fetch(`/api/posts/${currentPost._id}`, {
				method: "DELETE",
			});
			const data = await res.json();
			if (data.error) {
				showToast("Error", data.error, "error");
				return;
			}
			showToast("Success", "Post deleted", "success");
			navigate(`/${user.username}`);
		} catch (error) {
			showToast("Error", error.message, "error");
		}
	};

  if (!user && loading) {
    return ( 
      <Flex justifyContent={"center"} mt={10}>
        <Spinner size={"xl"} />
      </Flex>
    );
  }

  if (!currentPost) return null;

  return (
    <>
      <Flex w="full" justifyContent={"space-between"} alignItems={"center"} my={4}>
        <Flex alignItems={"center"} gap={"3"}>
          <Avatar src={user.profilePic} size={"md"} name={user.name} />
          <Flex alignItems="center">
            <Text fontSize={"sm"} fontWeight={"bold"}>{user.username}</Text>
            <Image src='/verified.png' w="4" h="4" ml={2} />
          </Flex>
        </Flex>
        <Flex gap={4} alignItems={"center"}>
          <Text fontSize={"xs"} color={"gray.light"} >
            {formatDistanceToNow(new Date(currentPost.createdAt))} ago
          </Text>
          {currentUser?._id === user._id && (
            <DeleteIcon size={20} onClick={handleDeletePost} cursor={"pointer"} />
          )}
        </Flex>
      </Flex>

      <Text my={4}>{currentPost.text}</Text>

      {currentPost.img && (
        <Box 
          borderRadius={6}
          overflow={"hidden"}
          border={"1px solid"}
          borderColor={"gray.light"}
          mb={4}
        >
           <Image src={currentPost.img} w={"full"} />
        </Box> 
      )}

      <Flex gap={3} my={3}>
        <Actions post={currentPost} posts={posts} setPosts={setPosts} />
      </Flex>
      
      <Divider my={4} />

      {currentPost.replies.map((reply) => (
        <Comment
          key={reply._id}
          reply={reply}
          lastReply={reply._id === currentPost.replies[currentPost.replies.length - 1]._id}
        />
      ))}
    </>
  );
};

export default PostPage;
