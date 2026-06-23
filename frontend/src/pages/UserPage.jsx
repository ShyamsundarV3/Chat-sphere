import UserHeader from '../components/UserHeader';
import { Flex, Heading } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useShowToast from '../hooks/useShowToast';
import { Spinner } from '@chakra-ui/react';
import Post from '../components/Post';
import useGetUserProfile from '../hooks/useGetUserProfile';
import { useRecoilState } from 'recoil';
import postsAtom from '../atoms/postsAtom';

const UserPage = () => {
  const { user, loading } = useGetUserProfile();
  const { username } = useParams();
  const showToast = useShowToast();
  const [posts, setPosts] = useRecoilState(postsAtom);
  const [fetchingPosts, setFetchingPosts] = useState(true);

  useEffect(() => {
    const getPosts = async () => {
      if (!username) return;
      setFetchingPosts(true);
      try {
        const res = await fetch(`/api/posts/user/${username}`);
        const data = await res.json();
        if (data.error) {
          showToast("Error", data.error, "error");
          setPosts([]);
          return;
        }
        setPosts(data);
      } catch (error) {
        showToast("Error", error.message, "error");
        setPosts([]);
      } finally {
        setFetchingPosts(false);
      }
    };

    getPosts();

    // Reset posts when unmounting to prevent pollution
    return () => setPosts([]);
  }, [username, showToast, setPosts]);

  if (!user && loading) {
    return (
      <Flex justifyContent={"center"} mt={10}>
        <Spinner size="xl" />
      </Flex>
    );
  }
  
  if (!user && !loading) return <Heading size="md" textAlign="center" mt={10}>User not found</Heading>;

  return (
    <>
      {/* 🔴 FIX: Using key={user._id} forces React to mount a new header and reset the follow states */}
      <UserHeader key={user._id} user={user} />

      {!fetchingPosts && posts.length === 0 && (
        <Heading size="sm" textAlign="center" mt={10} color={"gray.500"}>User has no posts.</Heading>
      )}
      
      {fetchingPosts && (
        <Flex justifyContent={"center"} my={12}>
          <Spinner size={"xl"} />
        </Flex>
      )}

      {!fetchingPosts && posts.map((post) => (
        <Post 
          key={post._id} 
          post={post} 
          postedBy={post.postedBy} 
          posts={posts} 
          setPosts={setPosts} 
        />
      ))}
    </>
  );
};

export default UserPage;
