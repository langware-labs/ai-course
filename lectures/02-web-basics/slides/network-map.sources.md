---
id: bb226984-b59a-4639-b76a-24a8ae8ea18f
---
# Sources for the internet map (network-map.js)

The chains are simplified for 8th grade. Every machine and hop is backed by one of these, collected 2026-09-17. Facts that could not be confirmed were left out.

## YouTube
- DNS answers by location; Google's load balancers (Maglev + Google Front End) — https://www.caida.org/catalog/papers/2018_revealing_load_balancing_behavior/revealing_load_balancing_behavior.pdf, https://research.google/pubs/maglev-a-fast-and-reliable-software-network-load-balancer/
- App requests: page, then `youtubei/v1/player` (video info + stream links), then video chunks from `googlevideo.com` — https://iter.ca/post/yt-adblock/
- Google Global Cache inside ISPs serves 70–90% of cacheable traffic — https://support.google.com/interconnect/answer/9058809
- Vitess: YouTube's MySQL at huge scale — https://vitess.io/docs/22.0/overview/history/
- 500+ hours uploaded per minute (2019) — https://www.tubefilter.com/2019/05/07/number-hours-video-uploaded-to-youtube-per-minute/

## WhatsApp
- End-to-end encryption (Signal protocol) — https://www.bitsoffreedom.nl/wp-content/uploads/WhatsApp-Security-Whitepaper.pdf
- Ticks: one = sent, two grey = delivered, two blue = read — https://faq.whatsapp.com/665923838265756/
- Delivery receipts sent by the recipient's device — https://arxiv.org/abs/2411.11194
- Undelivered messages kept encrypted up to 30 days; deleted after delivery — https://www.whatsapp.com/legal/privacy-policy
- 100 billion messages/day (2020) — https://techcrunch.com/2020/10/29/whatsapp-is-now-delivering-roughly-100-billion-messages-a-day
- 2+ million connections on one server (2012) — https://blog.whatsapp.com/1-million-is-so-2011

## Waze
- Passive GPS/speed reports + user reports build traffic — https://support.google.com/waze/partners/answer/10618035
- Routing server uses live and historical speeds — https://wazeopedia.waze.com/wiki/USA/Routing_server
- Waze's own volunteer-edited map, 20M+ edits/month — https://www.waze.com/map-editors
- Search combines Waze and Google places — https://www.waze.com/discuss/t/places/377947
- Google acquisition 2013 (~$1.1B); traffic reports shared with Google Maps — https://blog.google/products/maps/google-maps-and-waze-outsmarting/, https://techcrunch.com/2013/06/11/its-official-google-buys-waze-giving-a-social-data-boost-to-its-location-and-mapping-business/

## Instagram
- Meta edge load balancer (Katran) — https://engineering.fb.com/2018/05/22/open-source/open-sourcing-katran-a-scalable-network-load-balancer/
- Django app servers, TAO + Cassandra, multi-region copies, Celery background jobs — https://opensource.com/article/18/10/instagram-scaled-infrastructure
- Feed ranking over ~500 candidate posts — https://transparency.meta.com/features/explaining-ranking/ig-feed/
- Media CDN nodes inside ISPs — https://anuragbhatia.com/2018/03/networking/isp-column/mapping-facebooks-fna-cdn-nodes-across-the-world/
- Media encoded in several versions — https://engineering.fb.com/2022/11/04/video-engineering/instagram-video-processing-encoding-reduction/
- ~25 Django servers in 2011 — https://highscalability.com/instagram-architecture-14-million-users-terabytes-of-photos/

## Roblox
- Core data centers, 24 edge data centers, 30.6M concurrent (June 2025) — https://about.roblox.com/newsroom/2025/06/roblox-infrastructure-supporting-record-breaking-games
- Matchmaking by location/latency — https://about.roblox.com/newsroom/2023/10/inside-tech-solving-matchmaking-roblox/
- Server is the authority; replication to clients — https://create.roblox.com/docs/projects/client-server
- DataStore saves progress — https://create.roblox.com/docs/tutorials/use-case-tutorials/data-storage/save-player-data
- Chat filtered before others see it, billions of messages a day — https://about.roblox.com/newsroom/2025/07/roblox-ai-moderation-massive-scale
