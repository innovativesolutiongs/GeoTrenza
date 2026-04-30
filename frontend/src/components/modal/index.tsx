import { useState, useEffect } from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Fade from '@mui/material/Fade';
import Backdrop from '@mui/material/Backdrop';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: '5px',
};

const ModalOpen = ({ open, handleClose, employee, handleUpdate }: any) => {
  const [userName, setUserName] = useState('');
  const [userPass, setUserPass] = useState('');

  useEffect(() => {
    if (employee) {
      setUserName(employee.userName);
      setUserPass(employee.userPass);
    }
  }, [employee]);

  const handleSave = () => {
    const updatedEmployee = { ...employee, userName, userPass };
    handleUpdate(updatedEmployee);
  };

  return (
    <Modal
      aria-labelledby="transition-modal-title"
      aria-describedby="transition-modal-description"
      open={open}
      onClose={handleClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 500,
        },
      }}
    >
      <Fade in={open}>
        <Box sx={style}>
          <Typography
          style={{color:'red', fontSize:'16px'}}
           id="transition-modal-title" variant="h6" component="h2">
            <span>Create User</span> <span style={{color:'blue'}}>{employee && employee.userName}</span>
          </Typography>
          <Typography id="transition-modal-description" sx={{ mt: 2 }}>
            <TextField
              label="Username"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              fullWidth
              margin="normal"
              disabled
            />
            <TextField
              label="Password"
              value={userPass}
              onChange={(e) => setUserPass(e.target.value)}
              fullWidth
              margin="normal"
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              style={{ marginTop: '20px' }}
            >
              Update
            </Button>
          </Typography>
        </Box>
      </Fade>
    </Modal>
  );
};

export default ModalOpen;
