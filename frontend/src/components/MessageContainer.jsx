import { Avatar, Divider, Flex, useColorModeValue, Text, Image, SkeletonCircle, Skeleton } from '@chakra-ui/react';
import Message from './Message';
import MessageInput from './MessageInput';
import { useEffect, useRef, useState } from 'react';
import useShowToast from '../hooks/useShowToast';
import { useRecoilState, useRecoilValue } from 'recoil';
import { selectedConversationAtom, messagesAtom } from '../atoms/messagesAtom';
import userAtom from '../atoms/userAtom';
import { useSocket } from '../context/SocketContext';

const MessageContainer = () => {
  const showToast = useShowToast();
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messages, setMessages] = useRecoilState(messagesAtom);
  const currentUser = useRecoilValue(userAtom);
  const messagesEndRef = useRef(null);
  const { socket } = useSocket();
  const selectedConversationRef = useRef(selectedConversation);

  // Keep the ref in sync with the latest selectedConversation value
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Listen for incoming messages via socket in real-time
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      // Only append to the messages list if this message belongs to the active conversation
      if (selectedConversationRef.current.userId === message.sender) {
        setMessages((prev) => {
          // Prevent duplicates (ChatPage also has a listener)
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [socket, setMessages]);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const getMessages = async () => {
      setLoadingMessages(true);
      setMessages([]);
      try {
        if (selectedConversation.mock) return;
        const res = await fetch(`/api/messages/${selectedConversation.userId}`);
        const data = await res.json();
        if (data.error) {
          showToast("Error", data.error, "error");
          return;
        }
        setMessages(data);
      } catch (error) {
        showToast("Error", error.message, "error");
      } finally {
        setLoadingMessages(false);
      }
    };
    if (selectedConversation.userId) {
        getMessages();
    }
  }, [showToast, selectedConversation.userId, selectedConversation.mock, setMessages]);

  return (
    <Flex
      flex="70"
      bg={useColorModeValue("gray.200", "gray.dark")}
      borderRadius={"md"}
      flexDirection={"column"}
      p={3}
      h={"550px"}
    >
      <Flex w={"full"} h={12} alignItems={"center"} gap={2}>
        <Avatar src={selectedConversation.userProfilePic} size={"sm"} name={selectedConversation.username} />
        <Text display={"flex"} alignItems={"center"} fontWeight={"bold"}>
          {selectedConversation.username} <Image src='/verified.png' w={4} h={4} ml={1} />
        </Text>
      </Flex>

      <Divider my={2} />

      <Flex flexDir={"column"} gap={4} my={4} flex={1} p={2} overflowY={"auto"}>
        {loadingMessages && !selectedConversation.mock &&
          [...Array(5)].map((_, i) => (
            <Flex
              key={i}
              gap={2}
              alignItems={"center"}
              p={1}
              borderRadius={"md"}
              alignSelf={i % 2 === 0 ? "flex-start" : "flex-end"}
              w={"full"}
            >
              {i % 2 === 0 && <SkeletonCircle size={7} />}
              <Flex flexDir={"column"} gap={2} flex={1}>
                <Skeleton h="8px" w="150px" />
                <Skeleton h="8px" w="100px" />
              </Flex>
              {i % 2 !== 0 && <SkeletonCircle size={7} />}
            </Flex>
          ))}

        {!loadingMessages &&
          messages.map((message) => (
            <Message key={message._id} message={message} ownMessage={currentUser._id === message.sender} />
          ))}

        <div ref={messagesEndRef} />
      </Flex>

      <MessageInput setMessages={setMessages} />
    </Flex>
  );
};

export default MessageContainer;
