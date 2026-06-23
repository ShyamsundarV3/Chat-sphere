import { createContext, useEffect, useState, useContext } from "react";
import { useRecoilValue } from "recoil";
import io from "socket.io-client";
import userAtom from "../atoms/userAtom";

const SocketContext = createContext();

export const useSocket = () => {
	return useContext(SocketContext);
};

export const SocketContextProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const user = useRecoilValue(userAtom);

    useEffect(() => {
		const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
		const newSocket = io(socketUrl, {
			query: {
				userId: user?._id,
			},
			withCredentials: true,
		});

		setSocket(newSocket);

        newSocket.on("getOnlineUsers", (users) => {
			setOnlineUsers(users);
		});

        return () => {
            if (newSocket) newSocket.close();
        };
    }, [user?._id]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};
