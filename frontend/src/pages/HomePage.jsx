import { Box, Flex, Spinner, Heading } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import useShowToast from "../hooks/useShowToast";
import Post from "../components/Post";
import { useRecoilState } from "recoil";
import feedPostsAtom from "../atoms/feedPostsAtom";
import { useSocket } from "../context/SocketContext";
import SuggestedUsers from "../components/SuggestedUsers";

const HomePage = () => {
  const [posts, setPosts] = useRecoilState(feedPostsAtom);
  const [loading, setLoading] = useState(true);
  const showToast = useShowToast();
  const { socket } = useSocket();

  // Listen for real-time posts from followed users
  useEffect(() => {
    socket?.on("newPost", (post) => {
      setPosts((prev) => [post, ...prev]);
    });

    return () => socket?.off("newPost");
  }, [socket, setPosts]);

  useEffect(() => {
    const getFeedPosts = async () => {
      setLoading(true);
      setPosts([]);
      try {
        const res = await fetch("/api/posts/feed");
        const data = await res.json();
        if (data.error) {
          showToast("Error", data.error, "error");
          return;
        }
        setPosts(data);
      } catch (error) {
        showToast("Error", error.message, "error");
      } finally {
        setLoading(false);
      }
    };
    getFeedPosts();
  }, [showToast, setPosts]);

  return (
    <Flex gap={6} alignItems={"flex-start"} direction={{ base: "column", md: "row" }} w="full">
      {/* Main Feed */}
      <Box flex={70} w="full">
        {!loading && posts.length === 0 && (
          <Heading size="md" textAlign="center" mt={10}>
            Follow some users to populate your feed!
          </Heading>
        )}

        {loading && (
          <Flex justify='center' mt={10}>
            <Spinner size='xl' />
          </Flex>
        )}

        {!loading && posts.map((post) => (
          <Post 
            key={post._id} 
            post={post} 
            postedBy={post.postedBy} 
            posts={posts} 
            setPosts={setPosts} 
          />
        ))}
      </Box>

      {/* Suggested Users Sidebar */}
      <Box
        flex={30}
        w="full"
        display={{ base: "block", md: "block" }}
        position={{ md: "sticky" }}
        top={{ md: "100px" }}
      >
        <SuggestedUsers />
      </Box>
    </Flex>
  );
};

export default HomePage;
