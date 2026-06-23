import { Avatar, Flex, Text } from '@chakra-ui/react';
import { selectedConversationAtom } from '../atoms/messagesAtom';
import { useRecoilValue } from 'recoil';
import userAtom from '../atoms/userAtom';

const Message = ({ ownMessage, message }) => {
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const user = useRecoilValue(userAtom);

  return (
    <>
      {ownMessage ? (
        <Flex gap={2} alignSelf={"flex-end"} maxW={"80%"}>
          <Text maxW={"350px"} bg={"blue.500"} color={"white"} p={2} borderRadius={"md"} fontSize={"sm"}>
            {message.text}
          </Text>
          <Avatar src={user.profilePic} name={user.name} w="7" h={7} />
        </Flex>
      ) : (
        <Flex gap={2} alignSelf={"flex-start"} maxW={"80%"}>
          <Avatar src={selectedConversation.userProfilePic} name={selectedConversation.username} w="7" h={7} />
          <Text maxW={"350px"} bg={"gray.400"} color={"black"} p={2} borderRadius={"md"} fontSize={"sm"}>
            {message.text}
          </Text>
        </Flex>
      )}
    </>
  );
};

export default Message;
