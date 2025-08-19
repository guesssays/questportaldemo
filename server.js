const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

function saveBooking(data){
  const file = path.join(__dirname, 'bookings.json');
  let arr = [];
  if (fs.existsSync(file)) {
    try { arr = JSON.parse(fs.readFileSync(file, 'utf8') || '[]'); } catch {}
  }
  arr.push({...data, created_at: new Date().toISOString()});
  fs.writeFileSync(file, JSON.stringify(arr, null, 2), 'utf8');
}

app.post('/api/booking', (req, res) => {
  const { name, phone, date, time, quest, players, comment } = req.body || {};
  if (!name || !phone || !date || !time || !quest || !players) {
    return res.status(400).json({ ok:false, error:'Заполните обязательные поля.' });
  }
  saveBooking({ name, phone, date, time, quest, players, comment });
  res.json({ ok:true });
});

app.listen(PORT, ()=> console.log(`http://localhost:${PORT}`));
