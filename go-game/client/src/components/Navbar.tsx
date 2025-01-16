import React from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  HStack,
  Avatar,
} from '@chakra-ui/react';

interface NavbarProps {
  username: string;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ username, onLogout }) => {
  return (
    <Box bg="gray.800" px={4} color="white">
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <Text fontSize="xl" fontWeight="bold">
          围棋对弈平台
        </Text>

        <HStack spacing={4}>
          <Flex alignItems="center">
            <Avatar size="sm" name={username} mr={2} />
            <Text>{username}</Text>
          </Flex>
          <Button colorScheme="red" variant="outline" onClick={onLogout}>
            退出
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
};

export default Navbar;
