[out:json][timeout:120];
(area["ISO3166-2"="AT-4"]["admin_level"="4"];area["ISO3166-2"="AT-5"]["admin_level"="4"];)->.a;
(
  nwr["power"="substation"](area.a);
  nwr["power"="transformer"](area.a);
);
out center tags;
