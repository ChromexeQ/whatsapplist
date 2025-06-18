require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const channelSchema = new mongoose.Schema({
  link: { type: String, unique: true },
  name: String,
  image: String,
  boostedAt: Date,
  boosts: [{ userId: String, boostedAt: Date }],
});

const Channel = mongoose.model('Channel', channelSchema);

app.use(cors({
  origin: 'https:whatsapplist.onrender.com',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  if (!req.cookies.user_id) {
    const userId = uuidv4();
    res.cookie('user_id', userId, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    req.userId = userId;
  } else {
    req.userId = req.cookies.user_id;
  }
  next();
});

app.post('/api/channels', async (req, res) => {
  const { link } = req.body;
  const exists = await Channel.findOne({ link });
  if (exists) return res.status(400).json({ error: 'Podany kanał jest już dodany' });

  try {
    const response = await axios.get(link);
    const $ = cheerio.load(response.data);
    const name = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Kanał WhatsApp';
    const image = $('meta[property="og:image"]').attr('content') || '';
    const newChannel = new Channel({ link, name, image, boostedAt: new Date(), boosts: [] });
    await newChannel.save();
    res.json(newChannel);
  } catch (err) {
    res.status(400).json({ error: 'Niepoprawny link do kanału' });
  }
});

app.get('/api/channels', async (req, res) => {
  const channels = await Channel.find({}).sort({ boostedAt: -1 });
  res.json(channels);
});

app.post('/api/channels/:id/boost', async (req, res) => {
  const isAdmin = req.headers['x-admin'] === 'true';
  const userId = req.userId;
  const channel = await Channel.findById(req.params.id);
  if (!channel) return res.status(404).json({ error: 'Nie znaleziono kanału' });

  if (!isAdmin) {
    const recentBoost = await Channel.findOne({
      boosts: { $elemMatch: { userId, boostedAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) } } },
    });
    if (recentBoost) {
      return res.status(429).json({ error: 'Można boostować tylko raz na 15 minut' });
    }
  }

  channel.boostedAt = new Date();
  if (!isAdmin) channel.boosts.push({ userId, boostedAt: new Date() });
  await channel.save();
  res.json({ message: 'Zboostowano!' });
});

app.delete('/api/channels/:id', async (req, res) => {
  try {
    const result = await Channel.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Nie znaleziono kanału' });
    res.json({ message: 'Kanał usunięty' });
  } catch (err) {
    res.status(500).json({ error: 'Błąd usuwania' });
  }
});

const ADMIN_PASS_1 = process.env.ADMIN_PASS_1;
const ADMIN_PASS_2 = process.env.ADMIN_PASS_2;

app.post('/api/admin/login', (req, res) => {
  const { pass1, pass2 } = req.body;
  if (pass1 === ADMIN_PASS_1 && pass2 === ADMIN_PASS_2) {
    res.cookie('admin', 'true', { httpOnly: true });
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Niepoprawne hasła' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin');
  res.json({ success: true });
});

app.use(express.static(path.join(__dirname, '../client')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
