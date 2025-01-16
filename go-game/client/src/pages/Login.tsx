import React, { useState } from 'react';
import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Heading,
  useToast,
} from '@chakra-ui/react';

interface LoginProps {
  onLogin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({
        title: '请输入用户名',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    // TODO: 这里可以添加实际的登录验证
    setTimeout(() => {
      onLogin(username);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Box
      w="100%"
      h="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.50"
    >
      <Box
        p={8}
        maxWidth="400px"
        borderWidth={1}
        borderRadius="lg"
        boxShadow="lg"
        bg="white"
      >
        <VStack spacing={4} as="form" onSubmit={handleSubmit}>
          <Heading size="lg">围棋对弈平台</Heading>
          <FormControl isRequired>
            <FormLabel>用户名</FormLabel>
            <Input
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </FormControl>
          <Button
            colorScheme="blue"
            width="100%"
            type="submit"
            isLoading={isLoading}
          >
            登录
          </Button>
        </VStack>
      </Box>
    </Box>
  );
};

export default Login;
