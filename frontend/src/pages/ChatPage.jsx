import { SearchIcon } from '@chakra-ui/icons';
import { Box, Button, Flex, Input, Skeleton, SkeletonCircle, Text, useColorModeValue } from '@chakra-ui/react';
import Conversation from '../components/Conversation';
import { GiConversation } from "react-icons/gi";
import MessageContainer from '../components/MessageContainer';
import { useEffect, useRef, useState } from 'react';
import useShowToast from '../hooks/useShowToast';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { conversationsAtom, selectedConversationAtom, messagesAtom } from "../atoms/messagesAtom";
import userAtom from '../atoms/userAtom';
import { useSocket } from '../context/SocketContext';

const ChatPage = () => {
  const showToast = useShowToast();
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const setMessages = useSetRecoilState(messagesAtom);
  const [searchText, setSearchText] = useState("");
  const [searchingUser, setSearchingUser] = useState(false);
  const currentUser = useRecoilValue(userAtom);
  const { socket, onlineUsers } = useSocket();

  // Use a ref to always have the latest selectedConversation in the socket callback
  const selectedConversationRef = useRef(selectedConversation);
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // 🔴 FIX: Global page-level socket listener for incoming messages
  useEffect(() => {
    socket?.on("newMessage", (message) => {
      // 1. Update conversations list
      setConversations((prevConvs) => {
        const conversationExists = prevConvs.some((conv) => conv._id === message.conversationId);
        
        if (!conversationExists) {
          // Re-fetch conversations list to get thepopulated recipient details
          const reFetchConversations = async () => {
            try {
              const res = await fetch("/api/messages/conversations");
              const data = await res.json();
              if (!data.error) {
                setConversations(data);
              }
            } catch (err) {
              console.log("Error re-fetching conversations: ", err);
            }
          };
          reFetchConversations();
          return prevConvs;
        }

        // If conversation exists, update its lastMessage and move to top
        const updatedConvs = prevConvs.map((conv) => {
          if (conv._id === message.conversationId) {
            return {
              ...conv,
              lastMessage: {
                text: message.text,
                sender: message.sender,
              },
            };
          }
          return conv;
        });

        // Reorder conversations to place the newest updated conversation at index 0
        const targetIndex = updatedConvs.findIndex((c) => c._id === message.conversationId);
        if (targetIndex > 0) {
          const [targetConv] = updatedConvs.splice(targetIndex, 1);
          updatedConvs.unshift(targetConv);
        }

        return updatedConvs;
      });

      // 2. Play incoming message alert sound
      if (currentUser._id !== message.sender) {
        try {
          const sound = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-84.wav");
          sound.volume = 0.4;
          sound.play().catch(() => {});
        } catch (e) {
          console.log("Failed to play notification sound: ", e);
        }
      }

      // 3. Append to messages thread if the sender is our active selected conversation user (uses ref for fresh value)
      if (selectedConversationRef.current.userId === message.sender) {
        setMessages((prev) => {
          // Prevent duplicates (MessageContainer also has a listener)
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
    });

    return () => socket?.off("newMessage");
  }, [socket, setConversations, setMessages, currentUser._id]);

  useEffect(() => {
    const getConversations = async () => {
      setLoadingConversations(true);
      try {
        const res = await fetch("/api/messages/conversations");
        const data = await res.json();
        if (data.error) {
          showToast("Error", data.error, "error");
          return;
        }
        setConversations(data);
      } catch (error) {
        showToast("Error", error.message, "error");
      } finally {
        setLoadingConversations(false);
      }
    };

    getConversations();
    
    // Clear selection when leaving chat page
    return () => {
      setSelectedConversation({ _id: "", userId: "", username: "", userProfilePic: "" });
    };
  }, [showToast, setConversations, setSelectedConversation]);

  const handleConversationSearch = async (e) => {
		e.preventDefault();
		if (!searchText.trim()) return;
		setSearchingUser(true);
		try {
			const res = await fetch(`/api/users/profile/${searchText}`);
			const searchedUser = await res.json();
			if (searchedUser.error) {
				showToast("Error", searchedUser.error, "error");
				return;
			}

			const messagingYourself = searchedUser._id === currentUser._id;
			if (messagingYourself) {
				showToast("Error", "You cannot message yourself", "error");
				return;
			}

			const conversationAlreadyExists = conversations.find(
				(conversation) => conversation.participants[0]._id === searchedUser._id
			);

			if (conversationAlreadyExists) {
				setSelectedConversation({
					_id: conversationAlreadyExists._id,
					userId: searchedUser._id,
					username: searchedUser.username,
					userProfilePic: searchedUser.profilePic,
				});
				return;
			}

			const mockConversation = {
				mock: true,
				lastMessage: {
					text: "",
					sender: "",
				},
				_id: Date.now(),
				participants: [
					{
						_id: searchedUser._id,
						username: searchedUser.username,
						profilePic: searchedUser.profilePic,
					},
				],
			};
			setConversations((prevConvs) => [...prevConvs, mockConversation]);
			setSelectedConversation({
				_id: mockConversation._id,
				userId: searchedUser._id,
				username: searchedUser.username,
				userProfilePic: searchedUser.profilePic,
				mock: true,
			});
		} catch (error) {
			showToast("Error", error.message, "error");
		} finally {
			setSearchingUser(false);
		}
	};

  return (
    <Box position={"absolute"} left={"50%"} w={{ lg: "750px", md: "80%", base: "100%" }} p={4} transform={"translate(-50%)"}>
      <Flex gap={4} flexDirection={{ base: "column", md: "row" }} maxW={{ sm: "400px", md: "full" }} mx={"auto"}>
        <Flex flex={30} gap={2} flexDirection={"column"} maxW={{ sm: "250px", md: "full" }} mx={"auto"}>
          <Text fontWeight={700} color={useColorModeValue("gray.600", "gray.400")}>
              Your Conversations
          </Text>
          <form onSubmit={handleConversationSearch}>
              <Flex alignItems={"center"} gap={2}>
                  <Input placeholder='Search for a user' value={searchText} onChange={(e) => setSearchText(e.target.value)}/>
                  <Button size={"sm"} onClick={handleConversationSearch} isLoading={searchingUser}>
                      <SearchIcon />
                  </Button>
              </Flex>
          </form>

          {loadingConversations && 
              [0, 1, 2, 3, 4].map((_, i) => (
                  <Flex key={i} gap={4} alignItems={"center"} p={"1"} borderRadius={"md"}>
                      <Box>
                          <SkeletonCircle size={"10"}/>
                      </Box>
                      <Flex w={"full"} flexDirection={"column"} gap={3}>
                          <Skeleton h={"10px"} w={"80px"}/>
                          <Skeleton h={"8px"} w={"90%"}/>
                      </Flex>
                  </Flex>
              ))}

          {!loadingConversations && 
              conversations.map((conversation) => (
                  <Conversation
                      key={conversation._id}
                      isOnline={onlineUsers.includes(conversation.participants[0]?._id)}
                      conversation={conversation}
                  />
              ))}
        </Flex>
        
        {!selectedConversation._id && (
          <Flex flex={70} borderRadius={"md"} p={2} flexDir={"column"} alignItems={"center"} justifyContent={"center"} height={"400px"}>
              <GiConversation size={100} />
              <Text fontSize={20}>
                Select a Conversation to start messaging
              </Text>
          </Flex> 
        )}
        
        {selectedConversation._userId && <MessageContainer />}
      </Flex>
    </Box>
  );
};

export default ChatPage;
