/**
 * CONFIGURACIÓN OFICIAL - CAOZ
 * Color temático favorito: ROJO CYBER / CRIMSON
 */
const CREATOR_CONFIG = {
  name: "Caoz",
  fullName: "CaozYT",
  creatorCode: "CAOZ",
  email: "contacto.caoz@gmail.com",
  badge: "Streamer & Creador de Contenido",
  themeColor: "#ff1744", // Rojo favorito
  tagline: "Llevando el streaming, los videojuegos y la comunidad al nivel más alto.",
  roles: ["Streamer en Vivo", "Creador en YouTube & TikTok", "Gaming & Shooters", "Código: CAOZ"],

  // Canales para el reproductor y chat en vivo
  streams: {
    activePlatform: "kick", // 'kick', 'twitch', 'youtube'
    kick: {
      username: "caoz",
      channelUrl: "https://kick.com/caoz",
      playerUrl: "https://player.kick.com/caoz?autoplay=false",
      chatUrl: "https://kick.com/popout/caoz/chat"
    },
    twitch: {
      username: "caozssj",
      channelUrl: "https://www.twitch.tv/caozssj?lang=es",
      playerUrl: "https://player.twitch.tv/?channel=caozssj",
      chatUrl: "https://www.twitch.tv/embed/caozssj/chat"
    },
    youtube: {
      username: "caozyt",
      channelUrl: "https://www.youtube.com/@caozyt",
      embedUrl: "https://www.youtube.com/embed/live_stream?channel=caozyt",
      chatUrl: "https://www.youtube.com/live_chat?channel=caozyt"
    }
  },

  // Métricas y seguidores en redes sociales — Datos verificados Sep 2026
  stats: [
    {
      platform: "youtube",
      name: "YouTube",
      count: 1070000,
      displayCount: "1.07M+",
      label: "Suscriptores",
      handle: "@caoz",
      url: "https://www.youtube.com/@caoz",
      color: "#ff0000",
      icon: "youtube"
    },
    {
      platform: "tiktok",
      name: "TikTok",
      count: 923000,
      displayCount: "923K+",
      label: "Seguidores",
      handle: "@caozyt",
      url: "https://www.tiktok.com/@caozyt",
      color: "#ff0050",
      icon: "tiktok"
    },
    {
      platform: "kick",
      name: "Kick",
      count: 38000,
      displayCount: "38K+",
      label: "Seguidores",
      handle: "kick.com/caoz",
      url: "https://kick.com/caoz",
      color: "#53fc18",
      icon: "kick",
      customLogo: "assets/kick_logo.png"
    },
    {
      platform: "twitch",
      name: "Twitch",
      count: 78000,
      displayCount: "78K+",
      label: "Seguidores",
      handle: "twitch.tv/caozssj",
      url: "https://www.twitch.tv/caozssj?lang=es",
      color: "#9146ff",
      icon: "twitch"
    },
    {
      platform: "instagram",
      name: "Instagram",
      count: 64000,
      displayCount: "64K+",
      label: "Seguidores",
      handle: "@caozyt",
      url: "https://www.instagram.com/caozyt/",
      color: "#e1306c",
      icon: "instagram"
    },
    // {
    //   platform: "discord",
    //   name: "Discord",
    //   count: 42000,
    //   displayCount: "42K+",
    //   label: "Miembros Comunidad",
    //   handle: "Servidor Oficial",
    //   url: "https://discord.gg",
    //   color: "#5865f2",
    //   icon: "discord"
    // }
  ],

  // Paneles de Colaboraciones: ÚNICAMENTE Red Bull, Logitech y Kick (con logo original)
  brands: [
    {
      name: "Red Bull",
      role: "Colaboración Oficial",
      logoType: "text",
      accent: "#e00638"
    },
    {
      name: "Logitech",
      role: "Periféricos & Gaming",
      logoType: "text",
      accent: "#00b8fc"
    },
    {
      name: "Kick",
      role: "Plataforma Streaming",
      logoType: "image",
      logoImg: "assets/kick_logo.png",
      accent: "#53fc18"
    }
  ]
};
