import React from 'react';
import { Box } from '@chakra-ui/react';

interface BoardProps {
  board?: number[][];
  onIntersectionClick: (x: number, y: number) => void;
}

const Board: React.FC<BoardProps> = ({ 
  board = Array(19).fill(null).map(() => Array(19).fill(0)), 
  onIntersectionClick 
}) => {
  const handleClick = (x: number, y: number) => {
    onIntersectionClick(x, y);
  };

  return (
    <Box
      position="relative"
      width="600px"
      height="600px"
      backgroundColor="#DEB887"
      borderRadius="4px"
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 600 600"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* 绘制网格线 */}
        {Array.from({ length: 19 }, (_, i) => (
          <React.Fragment key={`grid-${i}`}>
            <line
              x1={30 + i * 30}
              y1="30"
              x2={30 + i * 30}
              y2="570"
              stroke="black"
              strokeWidth="1"
            />
            <line
              x1="30"
              y1={30 + i * 30}
              x2="570"
              y2={30 + i * 30}
              stroke="black"
              strokeWidth="1"
            />
          </React.Fragment>
        ))}

        {/* 绘制星位 */}
        {[3, 9, 15].map(x =>
          [3, 9, 15].map(y => (
            <circle
              key={`star-${x}-${y}`}
              cx={30 + x * 30}
              cy={30 + y * 30}
              r="4"
              fill="black"
            />
          ))
        )}

        {/* 绘制棋子 */}
        {board.map((row, y) =>
          row.map((cell, x) => {
            if (cell !== 0) {
              return (
                <circle
                  key={`stone-${x}-${y}`}
                  cx={30 + x * 30}
                  cy={30 + y * 30}
                  r="14"
                  fill={cell === 1 ? 'black' : 'white'}
                  stroke={cell === 2 ? 'black' : 'none'}
                  strokeWidth="1"
                />
              );
            }
            return null;
          })
        )}

        {/* 点击区域 */}
        {board.map((row, y) =>
          row.map((_, x) => (
            <rect
              key={`click-${x}-${y}`}
              x={15 + x * 30}
              y={15 + y * 30}
              width="30"
              height="30"
              fill="transparent"
              onClick={() => handleClick(x, y)}
              style={{ cursor: 'pointer' }}
            />
          ))
        )}
      </svg>
    </Box>
  );
};

export default Board;
