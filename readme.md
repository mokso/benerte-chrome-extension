# BeneRTE Chrome Extension

Highly unofficial chrome extension to subscribe to [BeneRTE](https://doc.beneservices.com/rte/) events and popping up notifications. This is just my personal hobby project. 

## How it works

Enter your Benemen credentials on extension popup page. This authenticates your user aganist [BeneAPI](https://doc.beneservices.com/beneapi/) and stores secretkey to local storage of the extension.

Background page of extension retrieves token from api using secretkey stored in local storage, and creates RTE session.

## How to add this to browser

1. Clone the repo or download as ZIP
2. Enable developermode in chrome [chrome://extensions/](chrome://extensions/)
3. Select 'Load unpacked' from extension menu, and select benerte-extension directory
4. Enjoy 


