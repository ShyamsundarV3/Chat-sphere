import { Input, InputGroup, InputRightElement } from '@chakra-ui/react';
import { IoSendSharp } from "react-icons/io5";
import { useState } from 'react';
import useShowToast from '../hooks/useShowToast';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { conversationsAtom, selectedConversationAtom } from '../atoms/messagesAtom';

const MessageInput = ({ setMessages }) => {
  const [messageText, setMessageText] = useState("");
  const showToast = useShowToast();
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const setConversations = useSetRecoilState(conversationsAtom); 

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
          recipientId: selectedConversation.userId,
        }),
      });

      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      
      setMessageText("");
      setMessages((prevMessages) => [...prevMessages, data]);

      // Update lastMessage inside conversations list
      setConversations((prevConvs) => {
				return prevConvs.map((conversation) => {
					if (conversation._id === selectedConversation._id) {
						return {
							...conversation,
							_id: data.conversationId, // Update from mock ID to actual database ID
							lastMessage: {
								text: messageText,
								sender: data.sender,
							},
							mock: false,
						};
					}
					return conversation;
				});
			});

      // Update selected conversation atom to reflect non-mock status and correct database ID
      if (selectedConversation.mock) {
          setSelectedConversation((prev) => ({
              ...prev,
              _id: data.conversationId,
              mock: false,
          }));
      }
    } catch (error) {
      showToast("Error", error.message || error, "error");
    }
  };

  return (
    <form onSubmit={handleSendMessage}>
      <InputGroup>
        <Input 
          w={"full"} 
          placeholder='Type a message' 
          onChange={(e) => setMessageText(e.target.value)}
          value={messageText}
        /> 
        <InputRightElement onClick={handleSendMessage} cursor={"pointer"}>
          <IoSendSharp />
        </InputRightElement>
      </InputGroup>
    </form>
  );
};

export default MessageInput;
