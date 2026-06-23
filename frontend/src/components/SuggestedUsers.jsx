import {
  Box, Flex, Text, Avatar, Button, Input, InputGroup, InputLeftElement,
  VStack, Spinner, useColorModeValue, Divider, Badge
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import userAtom from '../atoms/userAtom';
import useShowToast from '../hooks/useShowToast';
import { Link as RouterLink } from 'react-router-dom';

const SuggestedUsers = () => {
  const [currentUser, setCurrentUser] = useRecoilState(userAtom);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [followingMap, setFollowingMap] = useState({});
  const [updatingFollow, setUpdatingFollow] = useState({});
  const showToast = useShowToast();

  const cardBg = useColorModeValue("white", "gray.dark");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "#2a2a2a");
  const subtleText = useColorModeValue("gray.500", "gray.400");
  const inputBg = useColorModeValue("gray.50", "#1a1a1a");

  // Initialize the following map from the current user's following list
  useEffect(() => {
    if (currentUser?.following) {
      const map = {};
      currentUser.following.forEach((id) => {
        map[id] = true;
      });
      setFollowingMap(map);
    }
  }, [currentUser?.following]);

  // Fetch suggested users on mount
  useEffect(() => {
    const fetchSuggested = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/users/suggested");
        const data = await res.json();
        if (data.error) {
          showToast("Error", data.error, "error");
          return;
        }
        setSuggestedUsers(data);
      } catch (error) {
        showToast("Error", error.message, "error");
      } finally {
        setLoading(false);
      }
    };
    fetchSuggested();
  }, [showToast]);

  // Search users with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.error) {
          showToast("Error", data.error, "error");
          return;
        }
        setSearchResults(data);
      } catch (error) {
        showToast("Error", error.message, "error");
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, showToast]);

  const handleFollowUnfollow = async (userId, userName) => {
    if (!currentUser) {
      showToast("Error", "Please login to follow", "error");
      return;
    }
    if (updatingFollow[userId]) return;

    setUpdatingFollow((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/users/follow/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }

      const isCurrentlyFollowing = followingMap[userId];

      if (isCurrentlyFollowing) {
        // Unfollow
        showToast("Success", `Unfollowed ${userName}`, "success");
        setFollowingMap((prev) => {
          const copy = { ...prev };
          delete copy[userId];
          return copy;
        });
        // Update currentUser atom & localStorage
        const updatedFollowing = (currentUser.following || []).filter((id) => id !== userId);
        const updatedUser = { ...currentUser, following: updatedFollowing };
        setCurrentUser(updatedUser);
        localStorage.setItem("user-chatsphere", JSON.stringify(updatedUser));
      } else {
        // Follow
        showToast("Success", `Followed ${userName}`, "success");
        setFollowingMap((prev) => ({ ...prev, [userId]: true }));
        // Update currentUser atom & localStorage
        const updatedFollowing = [...(currentUser.following || []), userId];
        const updatedUser = { ...currentUser, following: updatedFollowing };
        setCurrentUser(updatedUser);
        localStorage.setItem("user-chatsphere", JSON.stringify(updatedUser));
      }
    } catch (error) {
      showToast("Error", error.message, "error");
    } finally {
      setUpdatingFollow((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const renderUserCard = (user) => (
    <Flex
      key={user._id}
      alignItems="center"
      gap={3}
      p={3}
      borderRadius="lg"
      _hover={{ bg: hoverBg }}
      transition="all 0.2s ease"
    >
      <RouterLink to={`/${user.username}`}>
        <Avatar
          size="sm"
          name={user.name}
          src={user.profilePic}
          cursor="pointer"
        />
      </RouterLink>

      <Box flex={1} minW={0}>
        <RouterLink to={`/${user.username}`}>
          <Text
            fontWeight="600"
            fontSize="sm"
            noOfLines={1}
            cursor="pointer"
            _hover={{ textDecoration: "underline" }}
          >
            {user.name}
          </Text>
        </RouterLink>
        <Text fontSize="xs" color={subtleText} noOfLines={1}>
          @{user.username}
        </Text>
      </Box>

      <Button
        size="xs"
        colorScheme={followingMap[user._id] ? "gray" : "blue"}
        variant={followingMap[user._id] ? "outline" : "solid"}
        onClick={() => handleFollowUnfollow(user._id, user.name)}
        isLoading={updatingFollow[user._id]}
        minW="70px"
        fontSize="xs"
      >
        {followingMap[user._id] ? "Unfollow" : "Follow"}
      </Button>
    </Flex>
  );

  const displayUsers = searchQuery.trim() ? searchResults : suggestedUsers;

  return (
    <Box
      bg={cardBg}
      borderRadius="xl"
      border="1px solid"
      borderColor={borderColor}
      p={4}
      w="full"
    >
      {/* Search Bar */}
      <InputGroup size="sm" mb={4}>
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.400" />
        </InputLeftElement>
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          borderRadius="lg"
          bg={inputBg}
          border="1px solid"
          borderColor={borderColor}
          _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(66,153,225,0.4)" }}
          fontSize="sm"
        />
      </InputGroup>

      {/* Section Title */}
      <Flex alignItems="center" justifyContent="space-between" mb={3}>
        <Text fontWeight="700" fontSize="sm" color={subtleText} textTransform="uppercase" letterSpacing="wider">
          {searchQuery.trim() ? "Search Results" : "Suggested for you"}
        </Text>
        {searchQuery.trim() && searching && <Spinner size="xs" />}
      </Flex>

      <Divider mb={2} />

      {/* Users List */}
      <VStack spacing={0} align="stretch">
        {loading && !searchQuery.trim() && (
          <Flex justify="center" py={6}>
            <Spinner size="md" />
          </Flex>
        )}

        {searching && searchQuery.trim() && (
          <Flex justify="center" py={6}>
            <Spinner size="md" />
          </Flex>
        )}

        {!loading && !searching && displayUsers.length === 0 && (
          <Text fontSize="sm" color={subtleText} textAlign="center" py={6}>
            {searchQuery.trim()
              ? "No users found"
              : "No suggestions available"}
          </Text>
        )}

        {!loading && !searching && displayUsers.map(renderUserCard)}
      </VStack>

      {/* Footer hint */}
      {!searchQuery.trim() && !loading && suggestedUsers.length > 0 && (
        <>
          <Divider mt={3} mb={2} />
          <Text fontSize="xs" color={subtleText} textAlign="center">
            Follow users to see their posts in your feed
          </Text>
        </>
      )}
    </Box>
  );
};

export default SuggestedUsers;
