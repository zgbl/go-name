import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
} from '@chakra-ui/react';

interface GameSettings {
  mainTime: number;
  byoyomiTime: number;
  byoyomiPeriods: number;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  onSendInvite: () => void;
  isCounterInvite?: boolean;
}

const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  onSendInvite,
  isCounterInvite = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isCounterInvite ? '修改对局设置' : '对局设置'}</ModalHeader>
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>基本时限（分钟）</FormLabel>
              <NumberInput
                value={settings.mainTime}
                min={1}
                max={180}
                onChange={(_, value) =>
                  onSettingsChange({ ...settings, mainTime: value })
                }
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel>读秒时间（秒）</FormLabel>
              <NumberInput
                value={settings.byoyomiTime}
                min={10}
                max={60}
                onChange={(_, value) =>
                  onSettingsChange({ ...settings, byoyomiTime: value })
                }
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel>读秒次数</FormLabel>
              <NumberInput
                value={settings.byoyomiPeriods}
                min={1}
                max={10}
                onChange={(_, value) =>
                  onSettingsChange({ ...settings, byoyomiPeriods: value })
                }
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            取消
          </Button>
          <Button colorScheme="blue" onClick={onSendInvite}>
            {isCounterInvite ? '发送修改' : '发送邀请'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default InviteModal;
