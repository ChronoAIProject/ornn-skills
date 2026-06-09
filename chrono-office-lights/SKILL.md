---
name: chrono-office-lights
description: Turn the Chrono office lights on or off, room by room. Use whenever an employee or agent needs to control office lighting — the Dubai room, Corridor, Front and Mid Reception, Coworking Table, world-map light strips, or the main office light. Covers both the Home Assistant "Lights" dashboard for people and the NyxID-to-Home-Assistant API calls for agents.
version: "0.1"
metadata:
  category: plain
  location: chrono-office
  maintainer: chrono-platform
---

# Chrono Office Lights

The Chrono office lights run on **Home Assistant** (HAOS at `10.0.0.209`), reached through the **NyxID** `home-assistant` service. Wall-switch lights are `switch.*` entities; bulbs and strips are `light.*` entities.

## Two ways to control the lights

### A. For people — the "Lights" dashboard
1. Open Home Assistant.
2. In the left sidebar, click **Lights** (light-switch icon).
3. Each room is a card of toggles — tap a light to turn it on or off.

### B. For agents — call Home Assistant via NyxID
```bash
# turn ON  (use the matching domain: switch.* -> /services/switch, light.* -> /services/light)
nyxid proxy request home-assistant /services/switch/turn_on  -m POST -d '{"entity_id":"switch.dubai_room_back_light"}'
# turn OFF
nyxid proxy request home-assistant /services/switch/turn_off -m POST -d '{"entity_id":"switch.dubai_room_back_light"}'
# control several at once
-d '{"entity_id":["switch.dubai_room_back_light","switch.dubai_room_front_light"]}'
# check a light's state
nyxid proxy request home-assistant /states/switch.dubai_room_back_light
```

## Room -> light entity reference

| Room | Entities |
|---|---|
| **Dubai Room** | `switch.dubai_room_back_light` (Back), `switch.dubai_room_front_light` (Front), `switch.dubai_room_spot_light` (Spot) |
| **Corridor** | `switch.corridor_corridor_back`, `switch.corridor_corridor_front`, `switch.corridor_world_map_bottom` |
| **Front Reception** | `switch.front_reception_recept_front`, `switch.front_reception_recept_seat`, `switch.front_reception_world_map_center` |
| **Mid Reception** | `switch.mid_reception_reception_mid`, `switch.mid_reception_reception_window`, `switch.mid_reception_world_map_top` |
| **Coworking Table** | `switch.coworking_table_ceiling_light` |
| **Light strips / bulbs** (`light.*`) | `light.world_map_lightstrip`, `light.coworking_table_lightstrip`, `light.aqara_hub_m1s_2379_lightbulb`, `light.office` |

## Examples

Turn **ON** all Dubai room lights:
```bash
nyxid proxy request home-assistant /services/switch/turn_on -m POST \
  -d '{"entity_id":["switch.dubai_room_back_light","switch.dubai_room_front_light","switch.dubai_room_spot_light"]}'
```

Turn **OFF** every office light (both domains):
```bash
nyxid proxy request home-assistant /services/switch/turn_off -m POST \
  -d '{"entity_id":["switch.dubai_room_back_light","switch.dubai_room_front_light","switch.dubai_room_spot_light","switch.corridor_corridor_back","switch.corridor_corridor_front","switch.corridor_world_map_bottom","switch.front_reception_recept_front","switch.front_reception_recept_seat","switch.front_reception_world_map_center","switch.mid_reception_reception_mid","switch.mid_reception_reception_window","switch.mid_reception_world_map_top","switch.coworking_table_ceiling_light"]}'
nyxid proxy request home-assistant /services/light/turn_off -m POST \
  -d '{"entity_id":["light.world_map_lightstrip","light.coworking_table_lightstrip","light.aqara_hub_m1s_2379_lightbulb","light.office"]}'
```

## Notes
- "Dubai room light" means the three `switch.dubai_room_*` relays (wall switch), **not** any `light.*` entity.
- Use the **switch** domain for `switch.*` and the **light** domain for `light.*` — mismatching the domain fails silently.
