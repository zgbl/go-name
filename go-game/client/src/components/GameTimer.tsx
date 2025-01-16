import React, { useState, useEffect } from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';

interface GameTimerProps {
  isActive: boolean;
  mainTime: number; // 保留时间（分钟）
  byoyomiTime: number; // 读秒时间（秒）
  byoyomiPeriods: number; // 读秒次数
  onTimeout: () => void;
}

const GameTimer: React.FC<GameTimerProps> = ({
  isActive,
  mainTime,
  byoyomiTime,
  byoyomiPeriods,
  onTimeout,
}) => {
  const [remainingMainTime, setRemainingMainTime] = useState(mainTime * 60);
  const [remainingByoyomiTime, setRemainingByoyomiTime] = useState(byoyomiTime);
  const [remainingPeriods, setRemainingPeriods] = useState(byoyomiPeriods);
  const [isInByoyomi, setIsInByoyomi] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isActive) {
      timer = setInterval(() => {
        if (!isInByoyomi && remainingMainTime > 0) {
          setRemainingMainTime(prev => prev - 1);
          if (remainingMainTime === 1) {
            setIsInByoyomi(true);
          }
        } else if (remainingPeriods > 0) {
          if (remainingByoyomiTime > 0) {
            setRemainingByoyomiTime(prev => prev - 1);
          } else {
            if (remainingPeriods > 1) {
              setRemainingPeriods(prev => prev - 1);
              setRemainingByoyomiTime(byoyomiTime);
            } else {
              onTimeout();
              clearInterval(timer);
            }
          }
        }
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [
    isActive,
    remainingMainTime,
    remainingByoyomiTime,
    remainingPeriods,
    isInByoyomi,
    byoyomiTime,
    onTimeout,
  ]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <VStack spacing={1} align="center">
      {!isInByoyomi && remainingMainTime > 0 ? (
        <Text fontSize="xl" fontWeight="bold">
          {formatTime(remainingMainTime)}
        </Text>
      ) : (
        <>
          <Text fontSize="xl" fontWeight="bold" color={remainingByoyomiTime <= 5 ? 'red.500' : 'inherit'}>
            {remainingByoyomiTime}秒
          </Text>
          <Text fontSize="sm">
            剩余{remainingPeriods}次
          </Text>
        </>
      )}
    </VStack>
  );
};

export default GameTimer;
