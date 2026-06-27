import {
  Text, Flex, Box, VStack, Link, Avatar, Button, Portal,
  Menu, MenuButton, MenuItem, MenuList,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, useDisclosure, Tabs, TabList, Tab, TabPanels, TabPanel,
  HStack, Spinner, useToast,
} from "@chakra-ui/react";
import { BsInstagram } from "react-icons/bs";
import { CgMoreO } from "react-icons/cg";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import useShowToast from "../hooks/useShowToast";
import { useRecoilValue, useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import { selectedConversationAtom } from "../atoms/messagesAtom";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Fix #2: single batch request instead of N parallel ones ─────────────────
const fetchUsersByIds = async (ids, signal) => {
  if (!ids || ids.length === 0) return [];
  const res = await fetch("/api/users/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Batch fetch failed: ${res.status}`);
  return res.json();
};

// ─── Fix #1: onOpen doesn't exist on <Modal>; trigger fetch via useEffect ────
const FollowListModal = ({ isOpen, onClose, followerIds, followingIds, userName }) => {
  const [activeTab, setActiveTab] = useState(0);
  // cache: { 0: [...], 1: [...] }
  const cache = useRef({});
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const showToast = useShowToast();

  // Fix #4: abort in-flight request on tab switch or modal close
  const abortRef = useRef(null);

  const loadTab = useCallback(async (tabIndex, forceRefresh = false) => {
    setActiveTab(tabIndex);

    if (!forceRefresh && cache.current[tabIndex]) {
      setList(cache.current[tabIndex]);
      return;
    }

    // Cancel any previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setList([]);
    try {
      const ids = [...new Set(
    tabIndex === 0 ? followerIds : followingIds
)];
      
      const users = await fetchUsersByIds(ids, controller.signal);

if (!Array.isArray(users)) {
    throw new Error("Invalid server response");
}

      // Fix #4: ignore result if this request was aborted
      cache.current[tabIndex] = users;
      setList(users);
    } catch (err) {
      if (err.name !== "AbortError") {
        showToast("Error", err.message || "Failed to load users", "error");
      }
    } finally {
      // Don't clear loading for aborted requests — another fetch is already in flight
      if (!controller.signal.aborted) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followerIds, followingIds, showToast]);

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Fix #1: useEffect reacts to isOpen — this is the correct Chakra v2 pattern
  useEffect(() => {
    if (!isOpen) {
      // Reset on close so re-open always fetches fresh
      cache.current = {};
      setActiveTab(0);
      setList([]);
      if (abortRef.current) abortRef.current.abort();
      return;
    }
    loadTab(0);
  }, [isOpen, loadTab]);

  const handleTabChange = (index) => loadTab(index);

  const isEmpty = !loading && list.length === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg={"gray.dark"} maxH="70vh">
        <ModalHeader>{userName}'s Network</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={4}>
          <Tabs index={activeTab} onChange={handleTabChange} isFitted variant="enclosed">
            <TabList mb={3}>
              <Tab fontWeight="bold">Followers ({followerIds.length})</Tab>
              <Tab fontWeight="bold">Following ({followingIds.length})</Tab>
            </TabList>
            <TabPanels>
              {[0, 1].map((idx) => (
                <TabPanel key={idx} px={0}>
                  {activeTab === idx && loading && (
                    <Flex justify="center" py={6}><Spinner /></Flex>
                  )}
                  {activeTab === idx && isEmpty && (
                    <Text color="gray.400" textAlign="center" py={4}>
                      {idx === 0 ? "No followers yet" : "Not following anyone"}
                    </Text>
                  )}
                  {activeTab === idx && !loading && list.length > 0 && (
                    <VStack align="stretch" spacing={3}>
                      {list.map((u) => (
                        <Link
                          key={u._id}
                          as={RouterLink}
                          to={`/${u.username}`}
                          onClick={onClose}
                          _hover={{ textDecoration: "none" }}
                        >
                          <HStack
                            p={2}
                            borderRadius="md"
                            _hover={{ bg: "whiteAlpha.100" }}
                            spacing={3}
                          >
                            <Avatar src={u.profilePic} name={u.name} size="sm" />
                            <Box>
                              <Text fontWeight="bold" fontSize="sm">{u.name}</Text>
                              <Text fontSize="xs" color="gray.400">@{u.username}</Text>
                            </Box>
                          </HStack>
                        </Link>
                      ))}
                    </VStack>
                  )}
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const UserHeader = ({ user }) => {
  const showToast = useShowToast();
  const toast = useToast();
  const navigate = useNavigate();
  const currentUser = useRecoilValue(userAtom);
  const setSelectedConversation = useSetRecoilState(selectedConversationAtom);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Fix #3: derive from props on every render; don't snapshot into useState
  const isFollowing = user.followers.includes(currentUser?._id);
  const followerCount = user.followers.length;

  // Local optimistic state layered on top of the derived values
  const [optimistic, setOptimistic] = useState({ delta: 0, override: null });
  const [updating, setUpdating] = useState(false);

  // Effective values shown in UI
  const displayFollowing = optimistic.override !== null ? optimistic.override : isFollowing;
  const displayCount = followerCount + optimistic.delta;

  const handleFollowUnfollow = async () => {
    if (!currentUser) {
      showToast("Error", "Please login to follow", "error");
      return;
    }
    if (updating) return;

    // Optimistic update
    const wasFollowing = displayFollowing;
    setOptimistic({ delta: wasFollowing ? -1 : 1, override: !wasFollowing });
    setUpdating(true);
    try {
      const res = await fetch(`/api/users/follow/${user._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      // Fix #5: check HTTP status, not just data.error
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      useEffect(() => {
    setOptimistic({ delta: 0, override: null });
}, [user.followers]);

      showToast(
        "Success",
        wasFollowing ? `Unfollowed ${user.name}` : `Followed ${user.name}`,
        "success"
      );
    } catch (error) {
      // Roll back optimistic update on failure
      setOptimistic({ delta: 0, override: null });
      showToast("Error", error.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleMessageClick = () => {
    if (!currentUser) {
      showToast("Error", "Please login to send a message", "error");
      return;
    }
    setSelectedConversation({
      _id: "",
      userId: user._id,
      username: user.username,
      userProfilePic: user.profilePic,
      mock: true,
    });
    navigate("/chat");
  };

  // Fix #5: proper clipboard error handling
  const copyURL = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Success",
        status: "success",
        description: "Profile link copied.",
        duration: 3000,
        isClosable: true,
      });
    } catch {
      // Fallback for browsers that block clipboard without HTTPS or focus
      toast({
        title: "Error",
        status: "error",
        description: "Could not copy link. Please copy the URL manually.",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const isOwnProfile = currentUser?._id === user._id;

  return (
    <VStack gap={4} alignItems={"start"} w="full">
      <Flex justifyContent={"space-between"} w={"full"}>
        <Box>
          <Text fontSize={"2xl"} fontWeight={"bold"}>{user.name}</Text>
          <Flex gap={2} alignItems={"center"}>
            <Text fontSize={"sm"}>{user.username}</Text>
            <Text fontSize={"xs"} bg={"gray.dark"} color={"gray.light"} p={1} borderRadius={"full"}>
              chatsphere.net
            </Text>
          </Flex>
        </Box>
        <Box>
          <Avatar
            name={user.name}
            src={user.profilePic || undefined}
            size={{ base: "md", md: "xl" }}
          />
        </Box>
      </Flex>

      <Text>{user.bio}</Text>

      {isOwnProfile && (
        <Link as={RouterLink} to="/update">
          <Button size={"sm"}>Update Profile</Button>
        </Link>
      )}

      {!isOwnProfile && (
        <Flex gap={2}>
          <Button size={"sm"} onClick={handleFollowUnfollow} isLoading={updating} isDisabled={updating}>
            {displayFollowing ? "Unfollow" : "Follow"}
          </Button>
          <Button
            size={"sm"}
            leftIcon={<IoChatbubbleEllipsesOutline />}
            onClick={handleMessageClick}
            variant="outline"
          >
            Message
          </Button>
        </Flex>
      )}

      <Flex w={"full"} justifyContent={"space-between"}>
        <Flex gap={2} alignItems={"center"}>
          <Text
            color={"gray.light"}
            cursor="pointer"
            _hover={{ textDecoration: "underline" }}
            onClick={onOpen}
          >
            {displayCount} followers
          </Text>
          <Box w="1" h="1" bg={"gray.light"} borderRadius={"full"} />
          {user.instagram && (
            <Link color={"gray.link"} href={`https://instagram.com/${user.instagram}`} isExternal>
              instagram.com/{user.instagram}
            </Link>
          )}
        </Flex>
        <Flex>
          <Box className="icon-container">
            <BsInstagram size={24} cursor={"pointer"} />
          </Box>
          <Box className="icon-container">
            <Menu>
              <MenuButton>
                <CgMoreO size={24} cursor={"pointer"} />
              </MenuButton>
              <Portal>
                <MenuList bg={"gray.dark"}>
                  <MenuItem bg={"gray.dark"} onClick={copyURL}>Copy Link</MenuItem>
                </MenuList>
              </Portal>
            </Menu>
          </Box>
        </Flex>
      </Flex>

      <Flex w={"full"}>
        <Flex flex={1} borderBottom={"1.5px solid white"} justifyContent={"center"} pb="3" cursor={"pointer"}>
          <Text fontWeight={"bold"}>chatsphere</Text>
        </Flex>
        <Flex flex={1} borderBottom={"1px solid gray"} color={"gray.light"} justifyContent={"center"} pb="3" cursor={"pointer"}>
          <Text fontWeight={"bold"}>Replies</Text>
        </Flex>
      </Flex>

      <FollowListModal
        isOpen={isOpen}
        onClose={onClose}
        followerIds={user.followers}
        followingIds={user.following}
        userName={user.name}
      />
    </VStack>
  );
};

export default UserHeader;