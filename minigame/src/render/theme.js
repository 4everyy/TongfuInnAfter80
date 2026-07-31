const theme = {
  colors: {
    deepWood: '#2B211C',
    wood: '#6E6254',
    paper: '#F7E9C7',
    jade: '#2F6F62',
    cinnabar: '#A83C2D',
    ink: '#2A211D',
    gold: '#D5A74A',
    muted: '#A79570',
    panel: '#E8D7AF',
    buttonShadow: '#6B462F',
  },
  fonts: {
    title: '"Songti SC","STSong","SimSun",serif',
    body: '-apple-system,"PingFang SC","Microsoft YaHei",sans-serif',
  },
  type: {
    caption: { size: 10, lineHeight: 14 },
    body: { size: 12, lineHeight: 18 },
    section: { size: 16, lineHeight: 22 },
    title: { size: 20, lineHeight: 28 },
    number: { size: 12, lineHeight: 16 },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  touch: { min: 44, medium: 48, large: 56 },
  radius: { control: 3, small: 4, panel: 6 },
  motion: { press: 70, release: 140, page: 180, resource: 420, scene: 500, debounce: 220 },
};

module.exports = { theme };
