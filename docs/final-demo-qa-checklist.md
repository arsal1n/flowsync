# FlowSync Final Demo QA Checklist

## Mobile App Scenarios

- [ ] Current Location → Dubai Marina
- [ ] Dubai Mall → Dubai Marina
- [ ] Manipal University Dubai → Dubai Marina
- [ ] Al Mankhool → Marina Pharmacy
- [ ] Rivington Heights search
- [ ] Invalid location search
- [ ] Same start/destination
- [ ] Select Route A
- [ ] Select Route B
- [ ] Select Route C
- [ ] Select Route D
- [ ] Start trip
- [ ] Progress update
- [ ] End trip completed
- [ ] End trip cancelled
- [ ] Driver role
- [ ] Admin role
- [ ] RTA/operator role
- [ ] Emergency role
- [ ] Alerts shown on map
- [ ] Trip summary shown

## Backend API Checks

- [ ] /api/health
- [ ] /api/locations/search?q=Manipal
- [ ] /api/locations/search?q=Rivington Heights
- [ ] /api/locations/search?q=randomxyznotreal
- [ ] /api/routes/recommend
- [ ] /api/trips/start
- [ ] /api/trips/progress
- [ ] /api/trips/end completed
- [ ] /api/trips/end cancelled

## Database Checks

- [ ] Required tables exist
- [ ] Route coordinates can store ordered real geometry
- [ ] Route steps can store ordered turn-by-turn steps
- [ ] Selected route is stored
- [ ] Navigation progress is stored
- [ ] Trip summary is stored
- [ ] Alerts/incidents/reports have coordinates
- [ ] Provider cache tables exist
- [ ] No generated files committed