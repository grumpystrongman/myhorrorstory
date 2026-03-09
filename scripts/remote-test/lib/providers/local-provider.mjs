export function createLocalProvider() {
  return {
    name: 'local',
    async openTunnel(_serviceName, targetUrl) {
      return {
        child: null,
        publicUrl: targetUrl
      };
    }
  };
}
