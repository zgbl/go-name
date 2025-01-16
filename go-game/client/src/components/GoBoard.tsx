import React, { useRef, useEffect, useCallback } from 'react';
import { Box } from '@chakra-ui/react';

interface GoBoardProps {
  size?: number; // 棋盘大小，默认19路
  cellSize?: number; // 每个格子的大小，像素
  board?: number[][]; // 棋盘状态，0空，1黑，2白
  onMove?: (position: { x: number; y: number }) => void;
}

const GoBoard: React.FC<GoBoardProps> = ({ 
  size = 19, 
  cellSize = 30,
  board = Array(19).fill(null).map(() => Array(19).fill(0)),
  onMove
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawStone = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: 'black' | 'white'
  ) => {
    const padding = cellSize;
    const centerX = padding + x * cellSize;
    const centerY = padding + y * cellSize;
    const radius = cellSize * 0.45;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    
    if (color === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.stroke();
    } else {
      ctx.fillStyle = '#000000';
      ctx.fill();
    }
  };

  const drawBoard = useCallback((ctx: CanvasRenderingContext2D) => {
    const padding = cellSize;
    const boardSize = (size - 1) * cellSize;

    // 清空画布
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 绘制棋盘背景
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 绘制网格线
    ctx.beginPath();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;

    // 绘制横线
    for (let i = 0; i < size; i++) {
      ctx.moveTo(padding, padding + i * cellSize);
      ctx.lineTo(padding + boardSize, padding + i * cellSize);
    }

    // 绘制竖线
    for (let i = 0; i < size; i++) {
      ctx.moveTo(padding + i * cellSize, padding);
      ctx.lineTo(padding + i * cellSize, padding + boardSize);
    }

    ctx.stroke();

    // 绘制星位
    const starPoints = size === 19 ? [
      [3, 3], [3, 9], [3, 15],
      [9, 3], [9, 9], [9, 15],
      [15, 3], [15, 9], [15, 15]
    ] : [
      [3, 3], [3, size-4], 
      [size-4, 3], [size-4, size-4]
    ];

    ctx.fillStyle = '#000000';
    starPoints.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(
        padding + x * cellSize,
        padding + y * cellSize,
        4,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });

    // 绘制棋子
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] === 1) {
          drawStone(ctx, x, y, 'black');
        } else if (board[y][x] === 2) {
          drawStone(ctx, x, y, 'white');
        }
      }
    }
  }, [size, cellSize, board]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onMove) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const padding = cellSize;

    // 计算点击的交叉点
    const boardX = Math.round((x - padding) / cellSize);
    const boardY = Math.round((y - padding) / cellSize);

    // 确保点击在有效范围内
    if (
      boardX >= 0 &&
      boardX < size &&
      boardY >= 0 &&
      boardY < size
    ) {
      console.log('Click at:', boardX, boardY);
      onMove({ x: boardX, y: boardY });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawBoard(ctx);
  }, [drawBoard, board]);

  return (
    <Box>
      <canvas
        ref={canvasRef}
        width={(size + 1) * cellSize}
        height={(size + 1) * cellSize}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      />
    </Box>
  );
};

export default GoBoard;
