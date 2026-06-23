import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  useColorModeValue,
  Avatar,
  Center,
} from '@chakra-ui/react';
import { useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import userAtom from '../atoms/userAtom';
import usePreviewImg from '../hooks/usePreviewImg';
import useShowToast from '../hooks/useShowToast';

export default function UpdateProfilePage() {
	const [user, setUser] = useRecoilState(userAtom);
	const [inputs, setInputs] = useState({
		name: user.name,
		username: user.username,
		email: user.email,
		bio: user.bio,
		password: ''
	});
	const fileRef = useRef(null);
	const [updating, setUpdating] = useState(false);
	const { handleImageChange, imgUrl } = usePreviewImg();
	const showToast = useShowToast();

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (updating) return;
		setUpdating(true);
		try {
			const res = await fetch(`/api/users/update/${user._id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ...inputs, profilePic: imgUrl }),
			});
			const data = await res.json();
			if (data.error) {
				showToast("Error", data.error, "error");
				return;
			}
			showToast("Success", "Profile Updated Successfully", "success");
			setUser(data);
			localStorage.setItem("user-chatsphere", JSON.stringify(data));
		} catch (error) {
			showToast('Error', error.message || error, 'error');
		} finally {
			setUpdating(false);
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<Flex my={6} align={'center'} justify={'center'}>
				<Stack
					spacing={4}
					w={'full'}
					maxW={'md'}
					bg={useColorModeValue('white', 'gray.dark')}
					rounded={'xl'}
					boxShadow={'lg'}
					p={6}
				>
					<Heading lineHeight={1.1} fontSize={{ base: '2xl', sm: '3xl' }}>
						User Profile Edit
					</Heading>
					<FormControl>
						<Stack direction={['column', 'row']} spacing={6}>
							<Center>
								<Avatar size="xl" boxShadow={"md"} src={imgUrl || user.profilePic} name={user.name} />
							</Center>
							<Center w="full">
								<Button w="full" onClick={() => fileRef.current.click()}>Change Avatar</Button>
								<Input type='file' hidden ref={fileRef} onChange={handleImageChange} />
							</Center>
						</Stack>
					</FormControl>
					<FormControl isRequired>
						<FormLabel>Full name</FormLabel>
						<Input
							placeholder='Full Name'
							value={inputs.name}
							onChange={(e) => setInputs({ ...inputs, name: e.target.value })}
							type='text'
						/>
					</FormControl>
					<FormControl isRequired>
						<FormLabel>Username</FormLabel>
						<Input
							placeholder='Username'
							value={inputs.username}
							onChange={(e) => setInputs({ ...inputs, username: e.target.value })}
							type='text'
						/>
					</FormControl>
					<FormControl isRequired>
						<FormLabel>Email address</FormLabel>
						<Input
							placeholder='Email Address'
							value={inputs.email}
							onChange={(e) => setInputs({ ...inputs, email: e.target.value })}
							type='email'
						/>
					</FormControl>
					<FormControl>
						<FormLabel>Bio</FormLabel>
						<Input
							placeholder='Your Bio'
							value={inputs.bio}
							onChange={(e) => setInputs({ ...inputs, bio: e.target.value })}
							type='text'
						/>
					</FormControl>
					<FormControl>
						<FormLabel>Password</FormLabel>
						<Input
							placeholder='Enter new password (optional)'
							value={inputs.password}
							onChange={(e) => setInputs({ ...inputs, password: e.target.value })}
							type='password'
						/>
					</FormControl>
					<Stack spacing={6} direction={['column', 'row']}>
						<Button
							bg={'gray.light'}
							color={'white'}
							w="full"
							_hover={{
								bg: 'gray.600',
							}}
							onClick={() => window.history.back()}
						>
							Cancel
						</Button>
						<Button
							bg={'blue.500'}
							color={'white'}
							w="full"
							_hover={{
								bg: 'blue.600',
							}}
							type='submit'
							isLoading={updating}
						>
							Submit
						</Button>
					</Stack>
				</Stack>
			</Flex>
		</form>
	);
}
