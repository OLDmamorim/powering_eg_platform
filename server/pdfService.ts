import PDFDocument from 'pdfkit';

// Logótipo ExpressGlass em base64 (incorporado para funcionar em qualquer ambiente)
const LOGO_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAMwAAAA6CAYAAADfPBLaAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAABOSSURBVHgB7V0JeFRVln7vVZJKKgkhCQlJCGFfZBEQFBBBEUVFRRRxQ9u2u9Xu6e5xZnqmZ3p6pqd7Zrqnu6e7p3u6p7u7Z1xaW1FRFBVFRRRRQVBkFUhYE7Jvtbx35/xV9SqVSqWqUoFE5/u+fKl69e69555z7rnnnnvuJfgLQiLMXxBnLt/B8bPXcfLcTRw/ewMnz93AifM3ceLcDZw4fxMnzt/EifM3cfL8TZw8fxOnLtzCqQu3cOriLZy6eAunL93G6Uu3cfrSbZy5fBtnLt/GmSu/4cyV33D2ym84e+U3nL36G85d/Q3nrv6Gc1d/w/mrv+H81d9w4dpvuHDtN1y49hsuXv8NF6//hou//oaLv/6Gi7/+hku//oZLv/6GS7/+hsu//obLv/6Gy7/9hsu//YbLv/2GK7/9hiu//YYrv/2GK7/9hqu//Yarv/2Gq7/9hmu//YZrv/2Ga7/9huu//Ybrv/2G67/9hhu//YYbv/2GG7/9hpu//Yabv/2Gm7/9hlu//YZbv/2G27/9htu//Ybbv/2GO7/9hju//YY7v/2Gu7/9hru//Ya7v/2Ge7/9hnu//YZ7v/2G+7/9hvu//Yb7v/2GB7/9hge//YYHv/2Gh7/9hoe//YaHv/2GR7/9hke//YZHv/2Gx7/9hse//YbHv/2GJ7/9hie//YYnv/2Gp7/9hqe//Yanv/2GZ7/9hme//YZnv/2G57/9hue//Ybnv/2GF7/9hhe//YYXv/2Gl7/9hpe//YaXv/2GV7/9hle//YZXv/2G17/9hte//YbXv/2GN7/9hje//YY3v/2Gt7/9hre//Ya3v/2Gd7/9hne//YZ3v/2G97/9hve//Yb3v/2GD7/9hg+//YYPv/2Gj7/9ho+//YaPv/2GT7/9hk+//YZPv/2Gz7/9hs+//YbPv/2GL7/9hi+//YYvv/2Gr7/9hq+//Yavv/2Gb7/9hm+//YZvv/2G77/9hu+//Ybvv/2GH7/9hh+//YYfv/2Gn7/9hp+//Yafv/2GX7/9hl+//YZfv/2G37/9ht+//Ybfv/2GP7/9hj+//YY/v/2Gv7/9hr+//Ya/v/2Gf7/9hn+//YZ/v/2G/7/9hv+//Yb/vwOGA78DhgO/A4YDvwOGg78DhoO/A4ZDvwOGQ78DhsO/A4bDvwOGI78DhiO/A4ajvwOGo78DhmO/A4ZjvwOG478DhuO/A4YTvwOGE78DhpO/A4aTvwOG078DhtO/A4YzvwOGM78DhrO/A4azvwOGc78DhnO/A4bzvwOG878Dhgu/A4YLvwOGi78Dhou/A4ZLvwOGS78Dhsu/A4bLvwOGK78Dhiu/A4arvwOGq78Dhmu/A4ZrvwOG678Dhuu/A4YbvwOGG78Dhpu/A4abvwOGW78Dhlu/A4bbvwOG278Dhju/A4Y7vwOGu78Dhru/A4Z7vwOGe78Dhvu/A4b7vwOGB78DhgS/A4aHvwOGh78Dhke/A4ZHvwOGx78Dhse/A4YnvwOGJ78Dhqe/A4anvwOGZ78Dhme/A4bnvwOG578Dhhe/A4YXvwOGl78Dhpe/A4ZXvwOGV78Dhte/A4bXvwOGN78Dhje/A4a3vwOGt78Dhne/A4Z3vwOG978Dhve/A4YPvwOGD78Dho+/A4aPvwOGT78Dhk+/A4bPvwOGz78Dhi+/A4YvvwOGr78Dhq+/A4ZvvwOGb78Dhu+/A4bvvwOGH78Dhh++A4afvwOGn78Dhl++A4ZfvwOG378Dht++A4Y/vwOGP74Dhj++A4a/vwOGv74Dhr++A4Z/vwOGf74Dhn++A4b/vwOG/78DhgO/g4YDv4OGA7+DhkO/g4ZDv4OGw7+DhsO/g4YjvwOGI7+DhqO/g4ajv4OGY7+DhmO/g4bjv4OG47+DhhO/g4YTv4OGk7+DhpO/g4bTv4OG07+DhjO/g4Yzv4OGs7+DhrO/g4Zzv4OGc7+DhvO/g4bzv4OGC7+Dhgu/g4aLv4OGi7+Dhku/g4ZLv4OGy7+Dhsu/g4Yrv4OGK7+Dhqu/g4arv4OGa7+Dhmu/g4brv4OG67+Dhhu/g4Ybv4OGm7+Dhpu/g4Zbv4OGW7+Dhtu/g4bbv4OGO7+Dhju/g4a7v4OGu7+Dhnu/g4Z7v4OG+7+Dhvu/g4YHv4OGB7+Dhoe/g4aHv4OGR7+Dhke/g4bHv4OGx7+Dhie/g4Ynv4OGp7+Dhqe/g4Znv4OGZ7+Dhue/g4bnv4OGF7+Dhhe/g4aXv4OGl7+Dhle/g4ZXv4OG17+Dhte/g4Y3v4OGN7+Dhre/g4a3v4OGd7+Dhne/g4b3v4OG97+Dhg+/g4YPv4OGj7+Dho+/g4ZPv4OGT7+Dhs+/g4bPv4OGL7+Dhi+/g4avv4OGr7+Dhm+/g4Zvv4OG77+Dhu+/g4Yfv4OGH7+Dhp+/g4afv4OGX7+Dhl+/g4bfv4OG37+Dhj+/g4Y/v4OGP7+Dhr+/g4a/v4OGv7+Dhn+/g4Z/v4OGf7+Dhv+/g4b/v4OHA4cDhwOHA4cDh0OHA4dDhwOHQ4cDh8OHA4fDhwOHI4cDhyOHA4ejhwOHo4cDh2OHA4djhwOH44cDh+OHA4cThwOHE4cDh5OHA4eThwOHU4cDh1OHA4czhwOHM4cDh7OHA4ezhwOHc4cDh3OHA4fzhwOH84cDhwuHA4cLhwOHi4cDh4uHA4dLhwOHS4cDh8uHA4fLhwOHK4cDhyuHA4erhwOHq4cDh2uHA4drhwOH64cDh+uHA4cbhwOHG4cDh5uHA4ebhwOHW4cDh1uHA4fbhwOH24cDhzuHA4c7hwOHu4cDh7uHA4d7hwOHe4cDh/uHA4f7hwOHB4cDhweHA4eHhwOHh4cDh0eHA4dHhwOHx4cDh8eHA4cnhwOHJ4cDh6eHA4enhwOHZ4cDh2eHA4fnhwOH54cDhxeHA4cXhwOHl4cDh5eHA4dXhwOHV4cDh9eHA4fXhwOHN4cDhzeHA4e3hwOHt4cDh3eHA4d3hwOH94cDh/eHA4cPhwOHD4cDh4+HA4ePhwOHT4cDh0+HA4fPhwOHz4cDhy+HA4cvhwOHr4cDh6+HA4dvhwOHb4cDh++HA4fvhwOHH4cDhx+HA4efhwOHn4cDh1+HA4dfhwOH34cDh9+HA4c/hwOHP4cDhz+HA4e/hwOHv4cDh7+HA4d/hwOHf4cDh3+HA4f/hwOH/4cDhwOHg4cDh4OHA4dDh4OHQ4eDh0OHg4fDh4OHw4eDhyOHg4cjh4OHo4eDh6OHg4djh4OHY4eDh+OHg4fjh4OHE4eDhxOHg4eTh4OHk4eDh1OHg4dTh4OHM4eDhzOHg4ezh4OHs4eDh3OHg4dzh4OH84eDh/OHg4cLh4OHC4eDh4uHg4eLh4OHS4eDh0uHg4fLh4OHy4eDhyuHg4crh4OHq4eDh6uHg4drh4OHa4eDh+uHg4frh4OHG4eDhxuHg4ebh4OHm4eDh1uHg4dbh4OH24eDh9uHg4c7h4OHO4eDh7uHg4e7h4OHe4eDh3uHg4f7h4OH+4eDhweHg4cHh4OHh4eDh4eHg4dHh4OHR4eDh8eHg4fHh4OHJ4eDhyeHg4enh4OHp4eDh2eHg4dnh4OH54eDh+eHg4cXh4OHF4eDh5eHg4eXh4OHV4eDh1eHg4fXh4OH14eDhzeHg4c3h4OHt4eDh7eHg4d3h4OHd4eDh/eHg4f3h4OHD4eDhw+Hg4ePh4OHj4eDh0+Hg4dPh4OHz4eDh8+Hg4cvh4OHL4eDh6+Hg4evh4OHb4eDh2+Hg4fvh4OH74eDhx+Hg4cfh4OHn4eDh5+Hg4dfh4OHX4eDh9+Hg4ffh4OHP4eDhz+Hg4e/h4OHv4eDh3+Hg4d/h4OHf4eDh/+Hg4f/h4OHA4eDhwOHg4dDh4OHQ4eDh8OHg4fDh4OHI4eDhyOHg4ejh4OHo4eDh2OHg4djh4OHo4eDh6OHg4cTh4OHE4eDh5OHg4eTh4OHU4eDh1OHg4czh4OHM4eDh7OHg4ezh4OHc4eDh3OHg4fzh4OH84eDhwuHg4cLh4OHi4eDh4uHg4dLh4OHS4eDh8uHg4fLh4OHK4eDhyuHg4erh4OHq4eDh2uHg4drh4OHq4eDh6uHg4cbh4OHG4eDh5uHg4ebh4OHW4eDh1uHg4fbh4OH24eDhzuHg4c7h4OHu4eDh7uHg4d7h4OHe4eDh/uHg4f7h4OHB4eDhweHg4eHh4OHh4eDh0eHg4dHh4OHx4eDh8eHg4cnh4OHJ4eDh6eHg4enh4OHZ4eDh2eHg4fnh4OH54eDhxeHg4cXh4OHl4eDh5eHg4dXh4OHV4eDh9eHg4fXh4OHN4eDhzeHg4e3h4OHt4eDh3eHg4d3h4OH94eDh/eHg4cPh4OHD4eDh4+Hg4ePh4OHT4eDh0+Hg4fPh4OHz4eDhy+Hg4cvh4OHr4eDh6+Hg4dvh4OHb4eDh++Hg4fvh4OHH4eDhx+Hg4efh4OHn4eDh1+Hg4dfh4OH34eDh9+Hg4c/h4OHP4eDh7+Hg4e/h4OHf4eDh3+Hg4d/h4OH/4eDh/+Hg4cDhwOHA4cDh0OHA4dDhwOHw4cDh8OHA4cjhwOHI4cDh6OHA4ejhwOHY4cDh2OHA4ejhwOHo4cDhxOHA4cThwOHk4cDh5OHA4dThwOHU4cDhzOHA4czhwOHs4cDh7OHA4dzhwOHc4cDh/OHA4fzhwOHC4cDhwuHA4eLhwOHi4cDh0uHA4dLhwOHy4cDh8uHA4crhwOHK4cDh6uHA4erhwOHa4cDh2uHA4erhwOHq4cDhxuHA4cbhwOHm4cDh5uHA4dbhwOHW4cDh9uHA4fbhwOHO4cDhzuHA4e7hwOHu4cDh3uHA4d7hwOH+4cDh/uHA4cHhwOHB4cDh4eHA4eHhwOHR4cDh0eHA4fHhwOHx4cDhyeHA4cnhwOHp4cDh6eHA4dnhwOHZ4cDh+eHA4fnhwOHF4cDhxeHA4eXhwOHl4cDh1eHA4dXhwOH14cDh9eHA4c3hwOHN4cDh7eHA4e3hwOHd4cDh3eHA4f3hwOH94cDhw+HA4cPhwOHj4cDh4+HA4dPhwOHT4cDh8+HA4fPhwOHL4cDhy+HA4evhwOHr4cDh2+HA4dvhwOH74cDh++HA4cfhwOHH4cDh5+HA4efhwOHX4cDh1+HA4ffhwOH34cDhz+HA4c/hwOHv4cDh7+HA4d/hwOHf4cDh3+HA4f/hwOH/4cDhwOHA4cDhwOHA4dDhwOHQ4cDh8OHA4fDhwOHI4cDhyOHA4ejhwOHo4cDh2OHA4djhwOHo4cDh6OHA4cThwOHE4cDh5OHA4eThwOHU4cDh1OHA4czhwOHM4cDh7OHA4ezhwOHc4cDh3OHA4fzhwOH84cDhwuHA4cLhwOHi4cDh4uHA4dLhwOHS4cDh8uHA4fLhwOHK4cDhyuHA4erhwOHq4cDh2uHA4drhwOHq4cDh6uHA4cbhwOHG4cDh5uHA4ebhwOHW4cDh1uHA4fbhwOH24cDhzuHA4c7hwOHu4cDh7uHA4d7hwOHe4cDh/uHA4f7hwOHB4cDhweHA4eHhwOHh4cDh0eHA4dHhwOHx4cDh8eHA4cnhwOHJ4cDh6eHA4enhwOHZ4cDh2eHA4fnhwOH54cDhxeHA4cXhwOHl4cDh5eHA4dXhwOHV4cDh9eHA4fXhwOHN4cDhzeHA4e3hwOHt4cDh3eHA4d3hwOH94cDh/eHA4cPhwOHD4cDh4+HA4ePhwOHT4cDh0+HA4fPhwOHz4cDhy+HA4cvhwOHr4cDh6+HA4dvhwOHb4cDh++HA4fvhwOHH4cDhx+HA4efhwOHn4cDh1+HA4dfhwOH34cDh9+HA4c/hwOHP4cDh7+HA4e/hwOHf4cDh3+HA4d/hwOH/4cDh/+HA4cDhwOHA4cDhwOHQ4cDh0OHA4fDhwOHw4cDhyOHA4cjhwOHo4cDh6OHA4djhwOHY4cDh6OHA4ejhwOHE4cDhxOHA4eThwOHk4cDh1OHA4dThwOHM4cDhzOHA4ezhwOHs4cDh3OHA4dzhwOH84cDh/OHA4cLhwOHC4cDh4uHA4eLhwOHS4cDh0uHA4fLhwOHy4cDhyuHA4crhwOHq4cDh6uHA4drhwOHa4cDh6uHA4erhwOHG4cDhxuHA4ebhwOHm4cDh1uHA4dbhwOH24cDh9uHA4c7hwOHO4cDh7uHA4e7hwOHe4cDh3uHA4f7hwOH+4cDhweHA4cHhwOHh4cDh4eHA4dHhwOHR4cDh8eHA4fHhwOHJ4cDhyeHA4enhwOHp4cDh2eHA4dnhwOH54cDh+eHA4cXhwOHF4cDh5eHA4eXhwOHV4cDh1eHA4fXhwOH14cDhzeHA4c3hwOHt4cDh7eHA4d3hwOHd4cDh/eHA4f3hwOHD4cDhw+HA4ePhwOHj4cDh0+HA4dPhwOHz4cDh8+HA4cvhwOHL4cDh6+HA4evhwOHb4cDh2+HA4fvhwOH74cDhx+HA4cfhwOHn4cDh5+HA4dfhwOHX4cDh9+HA4ffhwOHP4cDhz+HA4e/hwOHv4cDh3+HA4d/hwOHf4cDh/+HA4f/hwOHA4cDhwOHA4cDh0OHA4dDhwOHw4cDh8OHA4cjhwOHI4cDh6OHA4ejhwOHY4cDh2OHA4ejhwOHo4cDhxOHA4cThwOHk4cDh5OHA4dThwOHU4cDhzOHA4czhwOHs4cDh7OHA4dzhwOHc4cDh/OHA4fzhwOHC4cDhwuHA4eLhwOHi4cDh0uHA4dLhwOHy4cDh8uHA4crhwOHK4cDh6uHA4erhwOHa4cDh2uHA4erhwOHq4cDhxuHA4cbhwOHm4cDh5uHA4dbhwOHW4cDh9uHA4fbhwOHO4cDhzuHA4e7hwOHu4cDh3uHA4d7hwOH+4cDh/uHA4cHhwOHB4cDh4eHA4eHhwOHR4cDh0eHA4fHhwOHx4cDhyeHA4cnhwOHp4cDh6eHA4dnhwOHZ4cDh+eHA4fnhwOHF4cDhxeHA4eXhwOHl4cDh1eHA4dXhwOH14cDh9eHA4c3hwOHN4cDh7eHA4e3hwOHd4cDh3eHA4f3hwOH94cDhw+HA4cPhwOHj4cDh4+HA4dPhwOHT4cDh8+HA4fPhwOHL4cDhy+HA4evhwOHr4cDh2+HA4dvhwOH74cDh++HA4cfhwOHH4cDh5+HA4efhwOHX4cDh1+HA4ffhwOH34cDhz+HA4c/hwOHv4cDh7+HA4d/hwOHf4cDh3+HA4f/hwOH/4cDhwOHA4cDhwOHA4dDhwOHQ4cDh8OHA4fDhwOHI4cDhyOHA4ejhwOHo4cDh2OHA4djhwOHo4cDh6OHA4cThwOHE4cDh5OHA4eThwOHU4cDh1OHA4czhwOHM4cDh7OHA4ezhwOHc4cDh3OHA4fzhwOH84cDhwuHA4cLhwOHi4cDh4uHA4dLhwOHS4cDh8uHA4fLhwOHK4cDhyuHA4erhwOHq4cDh2uHA4drhwOHq4cDh6uHA4cbhwOHG4cDh5uHA4ebhwOHW4cDh1uHA4fbhwOH24cDhzuHA4c7hwOHu4cDh7uHA4d7hwOHe4cDh/uHA4f7hwOHB4cDhweHA4eHhwOHh4cDh0eHA4dHhwOHx4cDh8eHA4cnhwOHJ4cDh6eHA4enhwOHZ4cDh2eHA4fnhwOH54cDhxeHA4cXhwOHl4cDh5eHA4dXhwOHV4cDh9eHA4fXhwOHN4cDhzeHA4e3hwOHt4cDh3eHA4d3hwOH94cDh/eHA4cPhwOHD4cDh4+HA4ePhwOHT4cDh0+HA4fPhwOHz4cDhy+HA4cvhwOHr4cDh6+HA4dvhwOHb4cDh++HA4fvhwOHH4cDhx+HA4efhwOHn4cDh1+HA4dfhwOH34cDh9+HA4c/hwOHP4cDh7+HA4e/hwOHf4cDh3+HA4d/hwOH/4cDh/+HA4cDhwOHA4cDhwOHQ4cDh0OHA4fDhwOHw4cDhyOHA4cjhwOHo4cDh6OHA4djhwOHY4cDh6OHA4ejhwOHE4cDhxOHA4eThwOHk4cDh1OHA4dThwOHM4cDhzOHA4ezhwOHs4cDh3OHA4dzhwOH84cDh/OHA4cLhwOHC4cDh4uHA4eLhwOHS4cDh0uHA4fLhwOHy4cDhyuHA4crhwOHq4cDh6uHA4drhwOHa4cDh6uHA4erhwOHG4cDhxuHA4ebhwOHm4cDh1uHA4dbhwOH24cDh9uHA4c7hwOHO4cDh7uHA4e7hwOHe4cDh3uHA4f7hwOH+4cDhweHA4cHhwOHh4cDh4eHA4dHhwOHR4cDh8eHA4fHhwOHJ4cDhyeHA4enhwOHp4cDh2eHA4dnhwOH54cDh+eHA4cXhwOHF4cDh5eHA4eXhwOHV4cDh1eHA4fXhwOH14cDhzeHA4c3hwOHt4cDh7eHA4d3hwOHd4cDh/eHA4f3hwOHD4cDhw+HA4ePhwOHj4cDh0+HA4dPhwOHz4cDh8+HA4cvhwOHL4cDh6+HA4evhwOHb4cDh2+HA4fvhwOH74cDhx+HA4cfhwOHn4cDh5+HA4dfhwOHX4cDh9+HA4ffhwOHP4cDhz+HA4e/hwOHv4cDh3+HA4d/hwOHf4cDh/+HA4f/hwOHA4cDhwOHA4cDh0OHA4dDhwOHw4cDh8OHA4cjhwOHI4cDh6OHA4ejhwOHY4cDh2OHA4ejhwOHo4cDhxOHA4cThwOHk4cDh5OHA4dThwOHU4cDhzOHA4czhwOHs4cDh7OHA4dzhwOHc4cDh/OHA4fzhwOHC4cDhwuHA4eLhwOHi4cDh0uHA4dLhwOHy4cDh8uHA4crhwOHK4cDh6uHA4erhwOHa4cDh2uHA4erhwOHq4cDhxuHA4cbhwOHm4cDh5uHA4dbhwOHW4cDh9uHA4fbhwOHO4cDhzuHA4e7hwOHu4cDh3uHA4d7hwOH+4cDh/uHA4cHhwOHB4cDh4eHA4eHhwOHR4cDh0eHA4fHhwOHx4cDhyeHA4cnhwOHp4cDh6eHA4dnhwOHZ4cDh+eHA4fnhwOHF4cDhxeHA4eXhwOHl4cDh1eHA4dXhwOH14cDh9eHA4c3hwOHN4cDh7eHA4e3hwOHd4cDh3eHA4f3hwOH94cDhw+HA4cPhwOHj4cDh4+HA4dPhwOHT4cDh8+HA4fPhwOHL4cDhy+HA4evhwOHr4cDh2+HA4dvhwOH74cDh++HA4cfhwOHH4cDh5+HA4efhwOHX4cDh1+HA4ffhwOH34cDhz+HA4c/hwOHv4cDh7+HA4d/hwOHf4cDh3+HA4f/hwOH/4cDhwOHA4cDhwOHA4dDhwOHQ4cDh8OHA4fDhwOHI4cDhyOHA4ejhwOHo4cDh2OHA4djhwOHo4cDh6OHA4cThwOHE4cDh5OHA4eThwOHU4cDh1OHA4czhwOHM4cDh7OHA4ezhwOHc4cDh3OHA4fzhwOH84cDhwuHA4cLhwOHi4cDh4uHA4dLhwOHS4cDh8uHA4fLhwOHK4cDhyuHA4erhwOHq4cDh2uHA4drhwOHq4cDh6uHA4cbhwOHG4cDh5uHA4ebhwOHW4cDh1uHA4fbhwOH24cDhzuHA4c7hwOHu4cDh7uHA4d7hwOHe4cDh/uHA4f7hwOHB4cDhweHA4eHhwOHh4cDh0eHA4dHhwOHx4cDh8eHA4cnhwOHJ4cDh6eHA4enhwOHZ4cDh2eHA4fnhwOH54cDhxeHA4cXhwOHl4cDh5eHA4dXhwOHV4cDh9eHA4fXhwOHN4cDhzeHA4e3hwOHt4cDh3eHA4d3hwOH94cDh/eHA4cPhwOHD4cDh4+HA4ePhwOHT4cDh0+HA4fPhwOHz4cDhy+HA4cvhwOHr4cDh6+HA4dvhwOHb4cDh++HA4fvhwOHH4cDhx+HA4efhwOHn4cDh1+HA4dfhwOH34cDh9+HA4c/hwOHP4cDh7+HA4e/hwOHf4cDh3+HA4d/hwOH/4cDh/+HA4cDhwOHA4cDhwOHQ4cDh0OHA4fDhwOHw4cDhyOHA4cjhwOHo4cDh6OHA4djhwOHY4cDh6OHA4ejhwOHE4cDhxOHA4eThwOHk4cDh1OHA4dThwOHM4cDhzOHA4ezhwOHs4cDh3OHA4dzhwOH84cDh/OHA4cLhwOHC4cDh4uHA4eLhwOHS4cDh0uHA4fLhwOHy4cDhyuHA4crhwOHq4cDh6uHA4drhwOHa4cDh6uHA4erhwOHG4cDhxuHA4ebhwOHm4cDh1uHA4dbhwOH24cDh9uHA4c7hwOHO4cDh7uHA4e7hwOHe4cDh3uHA4f7hwOH+4cDhweHA4cHhwOHh4cDh4eHA4dHhwOHR4cDh8eHA4fHhwOHJ4cDhyeHA4enhwOHp4cDh2eHA4dnhwOH54cDh+eHA4cXhwOHF4cDh5eHA4eXhwOHV4cDh1eHA4fXhwOH14cDhzeHA4c3hwOHt4cDh7eHA4d3hwOHd4cDh/eHA4f3hwOHD4cDhw+HA4ePhwOHj4cDh0+HA4dPhwOHz4cDh8+HA4cvhwOHL4cDh6+HA4evhwOHb4cDh2+HA4fvhwOH74cDhx+HA4cfhwOHn4cDh5+HA4dfhwOHX4cDh9+HA4ffhwOHP4cDhz+HA4e/hwOHv4cDh3+HA4d/hwOHf4cDh/+HA4f/hwOHA4cDhwOHA4cDh0OHA4dDhwOHw4cDh8OHA4cjhwOHI4cDh6OHA4ejhwOHY4cDh2OHA4ejhwOHo4cDhxOHA4cThwOHk4cDh5OHA4dThwOHU4cDhzOHA4czhwOHs4cDh7OHA4dzhwOHc4cDh/OHA4fzhwOHC4cDhwuHA4eLhwOHi4cDh0uHA4dLhwOHy4cDh8uHA4crhwOHK4cDh6uHA4erhwOHa4cDh2uHA4erhwOHq4cDhxuHA4cbhwOHm4cDh5uHA4dbhwOHW4cDh9uHA4fbhwOHO4cDhzuHA4e7hwOHu4cDh3uHA4d7hwOH+4cDh/uHA4cHhwOHB4cDh4eHA4eHhwOHR4cDh0eHA4fHhwOHx4cDhyeHA4cnhwOHp4cDh6eHA4dnhwOHZ4cDh+eHA4fnhwOHF4cDhxeHA4eXhwOHl4cDh1eHA4dXhwOH14cDh9eHA4c3hwOHN4cDh7eHA4e3hwOHd4cDh3eHA4f3hwOH94cDhw+HA4cPhwOHj4cDh4+HA4dPhwOHT4cDh8+HA4fPhwOHL4cDhy+HA4evhwOHr4cDh2+HA4dvhwOH74cDh++HA4cfhwOHH4cDh5+HA4efhwOHX4cDh1+HA4ffhwOH34cDhz+HA4c/hwOHv4cDh7+HA4d/hwOHf4cDh3+HA4f/hwOH/4cDhwOHA4cDhwOHA4dDhwOHQ4cDh8OHA4fDhwOHI4cDhyOHA4ejhwOHo4cDh2OHA4djhwOHo4cDh6OHA4cThwOHE4cDh5OHA4eThwOHU4cDh1OHA4czhwOHM4cDh7OHA4ezhwOHc4cDh3OHA4fzhwOH84cDhwuHA4cLhwOHi4cDh4uHA4dLhwOHS4cDh8uHA4fLhwOHK4cDhyuHA4erhwOHq4cDh2uHA4drhwOHq4cDh6uHA4cbhwOHG4cDh5uHA4ebhwOHW4cDh1uHA4fbhwOH24cDhzuHA4c7hwOHu4cDh7uHA4d7hwOHe4cDh/uHA4f7hwOHB4cDhweHA4eHhwOHh4cDh0eHA4dHhwOHx4cDh8eHA4cnhwOHJ4cDh6eHA4enhwOHZ4cDh2eHA4fnhwOH54cDhxeHA4cXhwOHl4cDh5eHA4dXhwOHV4cDh9eHA4fXhwOHN4cDhzeHA4e3hwOHt4cDh3eHA4d3hwOH94cDh/eHA4cPhwOHD4cDh4+HA4ePhwOHT4cDh0+HA4fPhwOHz4cDhy+HA4cvhwOHr4cDh6+HA4dvhwOHb4cDh++HA4fvhwOHH4cDhx+HA4efhwOHn4cDh1+HA4dfhwOH34cDh9+HA4c/hwOHP4cDh7+HA4e/hwOHf4cDh3+HA4d/hwOH/4cDh/+HA';

interface EvolucaoItem {
  mes: number;
  ano: number;
  totalServicos: number | null;
  objetivoMensal: number | null;
  qtdReparacoes: number | null;
}

interface DashboardData {
  kpis: {
    servicosRealizados: number;
    objetivoMensal: number;
    taxaReparacao: number;
    desvioObjetivoDiario: number;
    vendasComplementares: number;
  };
  resultados: {
    totalServicos: number;
    objetivoMensal: number;
    desvioPercentualMes: number | null;
    taxaReparacao: number | null;
    totalReparacoes: number;
    gapReparacoes22: number;
  };
  complementares: {
    escovasQtd: number;
    escovasPercent: number | null;
    polimentoQtd: number;
    tratamentoQtd: number;
    lavagensTotal: number;
    outrosQtd: number;
  };
  alertas: Array<{ tipo: 'warning' | 'danger' | 'success'; mensagem: string }>;
  periodoLabel: string;
  comparativoMesAnterior: {
    servicosAnterior: number;
    variacaoServicos: number | null;
    reparacoesAnterior: number;
    variacaoReparacoes: number | null;
    escovasAnterior: number;
    variacaoEscovas: number | null;
  };
  ritmo?: {
    servicosFaltam: number;
    diasUteisRestantes: number;
    servicosPorDia: number;
    gapReparacoes: number;
  };
  evolucao?: EvolucaoItem[];
}

interface AnaliseIA {
  focoUrgente: string[];
  pontosPositivos: string[];
  resumo: string;
}

// Cores
const azul = '#3B82F6';
const roxo = '#8B5CF6';
const verde = '#10B981';
const vermelho = '#EF4444';
const laranja = '#F97316';
const cinzaClaro = '#F3F4F6';
const cinzaEscuro = '#374151';
const amarelo = '#F59E0B';

const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Função para desenhar gráfico de barras nativo no PDFKit
function desenharGraficoBarras(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  dados: { label: string; valor1: number; valor2?: number }[],
  titulo: string,
  legenda1: string,
  legenda2?: string,
  cor1: string = azul,
  cor2: string = roxo
) {
  const marginLeft = 50;
  const marginBottom = 30;
  const marginTop = 30;
  const chartWidth = width - marginLeft - 20;
  const chartHeight = height - marginBottom - marginTop;
  
  // Título
  doc.fontSize(10).fillColor(cinzaEscuro);
  doc.text(titulo, x, y, { width, align: 'center' });
  
  // Encontrar valor máximo
  let maxVal = 0;
  dados.forEach(d => {
    if (d.valor1 > maxVal) maxVal = d.valor1;
    if (d.valor2 && d.valor2 > maxVal) maxVal = d.valor2;
  });
  maxVal = Math.ceil(maxVal * 1.1); // 10% de margem
  if (maxVal === 0) maxVal = 100;
  
  const chartX = x + marginLeft;
  const chartY = y + marginTop;
  
  // Eixo Y (linhas de grade)
  doc.strokeColor('#E5E7EB').lineWidth(0.5);
  for (let i = 0; i <= 4; i++) {
    const yPos = chartY + chartHeight - (i / 4) * chartHeight;
    doc.moveTo(chartX, yPos).lineTo(chartX + chartWidth, yPos).stroke();
    doc.fontSize(7).fillColor('#9CA3AF');
    doc.text(Math.round((i / 4) * maxVal).toString(), x, yPos - 4, { width: marginLeft - 5, align: 'right' });
  }
  
  // Barras
  const barGroupWidth = chartWidth / dados.length;
  const barWidth = legenda2 ? barGroupWidth * 0.35 : barGroupWidth * 0.6;
  const gap = legenda2 ? barGroupWidth * 0.1 : barGroupWidth * 0.2;
  
  dados.forEach((d, i) => {
    const groupX = chartX + i * barGroupWidth + gap;
    
    // Barra 1
    const bar1Height = (d.valor1 / maxVal) * chartHeight;
    doc.rect(groupX, chartY + chartHeight - bar1Height, barWidth, bar1Height).fill(cor1);
    
    // Barra 2 (se existir)
    if (legenda2 && d.valor2 !== undefined) {
      const bar2Height = (d.valor2 / maxVal) * chartHeight;
      doc.rect(groupX + barWidth + 2, chartY + chartHeight - bar2Height, barWidth, bar2Height).fill(cor2);
    }
    
    // Label do eixo X
    doc.fontSize(7).fillColor(cinzaEscuro);
    doc.text(d.label, groupX - gap/2, chartY + chartHeight + 5, { width: barGroupWidth, align: 'center' });
  });
  
  // Legenda
  const legendaY = y + height - 15;
  doc.rect(x + width/2 - 80, legendaY, 8, 8).fill(cor1);
  doc.fontSize(7).fillColor(cinzaEscuro);
  doc.text(legenda1, x + width/2 - 68, legendaY, { continued: false });
  
  if (legenda2) {
    doc.rect(x + width/2 + 20, legendaY, 8, 8).fill(cor2);
    doc.text(legenda2, x + width/2 + 32, legendaY);
  }
}

// Função para desenhar gráfico de linha nativo no PDFKit
function desenharGraficoLinha(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  dados: { label: string; valor: number }[],
  titulo: string,
  cor: string = verde,
  objetivo?: number,
  unidade: string = ''
) {
  const marginLeft = 50;
  const marginBottom = 30;
  const marginTop = 30;
  const chartWidth = width - marginLeft - 20;
  const chartHeight = height - marginBottom - marginTop;
  
  // Título
  doc.fontSize(10).fillColor(cinzaEscuro);
  doc.text(titulo, x, y, { width, align: 'center' });
  
  // Encontrar valor máximo e mínimo
  let maxVal = objetivo || 0;
  let minVal = 0;
  dados.forEach(d => {
    if (d.valor > maxVal) maxVal = d.valor;
    if (d.valor < minVal) minVal = d.valor;
  });
  maxVal = Math.ceil(maxVal * 1.2);
  if (minVal < 0) minVal = Math.floor(minVal * 1.2);
  const range = maxVal - minVal;
  if (range === 0) return;
  
  const chartX = x + marginLeft;
  const chartY = y + marginTop;
  
  // Eixo Y (linhas de grade)
  doc.strokeColor('#E5E7EB').lineWidth(0.5);
  for (let i = 0; i <= 4; i++) {
    const yPos = chartY + chartHeight - (i / 4) * chartHeight;
    doc.moveTo(chartX, yPos).lineTo(chartX + chartWidth, yPos).stroke();
    doc.fontSize(7).fillColor('#9CA3AF');
    const val = minVal + (i / 4) * range;
    doc.text(`${val.toFixed(1)}${unidade}`, x, yPos - 4, { width: marginLeft - 5, align: 'right' });
  }
  
  // Linha de objetivo (se existir)
  if (objetivo !== undefined) {
    const objY = chartY + chartHeight - ((objetivo - minVal) / range) * chartHeight;
    doc.strokeColor(vermelho).lineWidth(1);
    doc.moveTo(chartX, objY).lineTo(chartX + chartWidth, objY).dash(5, { space: 3 }).stroke().undash();
    doc.fontSize(7).fillColor(vermelho);
    doc.text(`Obj: ${objetivo}${unidade}`, chartX + chartWidth - 40, objY - 10);
  }
  
  // Desenhar linha
  if (dados.length > 0) {
    const stepX = chartWidth / (dados.length - 1 || 1);
    
    doc.strokeColor(cor).lineWidth(2);
    dados.forEach((d, i) => {
      const px = chartX + i * stepX;
      const py = chartY + chartHeight - ((d.valor - minVal) / range) * chartHeight;
      
      if (i === 0) {
        doc.moveTo(px, py);
      } else {
        doc.lineTo(px, py);
      }
    });
    doc.stroke();
    
    // Pontos
    dados.forEach((d, i) => {
      const px = chartX + i * stepX;
      const py = chartY + chartHeight - ((d.valor - minVal) / range) * chartHeight;
      doc.circle(px, py, 3).fill(cor);
      
      // Label do eixo X
      doc.fontSize(7).fillColor(cinzaEscuro);
      doc.text(d.label, px - 15, chartY + chartHeight + 5, { width: 30, align: 'center' });
    });
  }
}

// Função para desenhar gráfico de barras coloridas (desvio)
function desenharGraficoDesvio(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  dados: { label: string; valor: number }[],
  titulo: string
) {
  const marginLeft = 50;
  const marginBottom = 30;
  const marginTop = 30;
  const chartWidth = width - marginLeft - 20;
  const chartHeight = height - marginBottom - marginTop;
  
  // Título
  doc.fontSize(10).fillColor(cinzaEscuro);
  doc.text(titulo, x, y, { width, align: 'center' });
  
  // Encontrar valor máximo e mínimo
  let maxVal = 10;
  let minVal = -10;
  dados.forEach(d => {
    if (d.valor > maxVal) maxVal = d.valor;
    if (d.valor < minVal) minVal = d.valor;
  });
  maxVal = Math.ceil(maxVal * 1.2);
  minVal = Math.floor(minVal * 1.2);
  const range = maxVal - minVal;
  if (range === 0) return;
  
  const chartX = x + marginLeft;
  const chartY = y + marginTop;
  const zeroY = chartY + chartHeight - ((0 - minVal) / range) * chartHeight;
  
  // Eixo Y (linhas de grade)
  doc.strokeColor('#E5E7EB').lineWidth(0.5);
  for (let i = 0; i <= 4; i++) {
    const yPos = chartY + chartHeight - (i / 4) * chartHeight;
    doc.moveTo(chartX, yPos).lineTo(chartX + chartWidth, yPos).stroke();
    doc.fontSize(7).fillColor('#9CA3AF');
    const val = minVal + (i / 4) * range;
    doc.text(`${val.toFixed(0)}%`, x, yPos - 4, { width: marginLeft - 5, align: 'right' });
  }
  
  // Linha zero
  doc.strokeColor(cinzaEscuro).lineWidth(1);
  doc.moveTo(chartX, zeroY).lineTo(chartX + chartWidth, zeroY).stroke();
  
  // Barras
  const barWidth = (chartWidth / dados.length) * 0.6;
  const gap = (chartWidth / dados.length) * 0.2;
  
  dados.forEach((d, i) => {
    const barX = chartX + i * (chartWidth / dados.length) + gap;
    const barHeight = Math.abs((d.valor / range) * chartHeight);
    const barY = d.valor >= 0 ? zeroY - barHeight : zeroY;
    const barColor = d.valor >= 0 ? verde : vermelho;
    
    doc.rect(barX, barY, barWidth, barHeight).fill(barColor);
    
    // Valor no topo da barra
    doc.fontSize(7).fillColor(barColor);
    const textY = d.valor >= 0 ? barY - 10 : barY + barHeight + 2;
    doc.text(`${d.valor.toFixed(1)}%`, barX - 5, textY, { width: barWidth + 10, align: 'center' });
    
    // Label do eixo X
    doc.fontSize(7).fillColor(cinzaEscuro);
    doc.text(d.label, barX - gap/2, chartY + chartHeight + 5, { width: chartWidth / dados.length, align: 'center' });
  });
}

// Função para desenhar gráfico de barras horizontais (complementares)
function desenharGraficoComplementares(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  complementares: DashboardData['complementares'],
  titulo: string
) {
  const marginLeft = 80;
  const marginRight = 40;
  const chartWidth = width - marginLeft - marginRight;
  
  // Título
  doc.fontSize(10).fillColor(cinzaEscuro);
  doc.text(titulo, x, y, { width, align: 'center' });
  
  const dados = [
    { label: 'Escovas', valor: complementares.escovasQtd, cor: azul },
    { label: 'Polimento', valor: complementares.polimentoQtd, cor: roxo },
    { label: 'Tratamento', valor: complementares.tratamentoQtd, cor: verde },
    { label: 'Lavagens', valor: complementares.lavagensTotal, cor: laranja },
    { label: 'Outros', valor: complementares.outrosQtd, cor: amarelo },
  ];
  
  const maxVal = Math.max(...dados.map(d => d.valor), 1);
  const barHeight = 20;
  const gap = 10;
  let currentY = y + 25;
  
  dados.forEach(d => {
    // Label
    doc.fontSize(9).fillColor(cinzaEscuro);
    doc.text(d.label, x, currentY + 3, { width: marginLeft - 10, align: 'right' });
    
    // Barra
    const barWidth = (d.valor / maxVal) * chartWidth;
    doc.rect(x + marginLeft, currentY, Math.max(barWidth, 2), barHeight).fill(d.cor);
    
    // Valor
    doc.fontSize(9).fillColor(cinzaEscuro);
    doc.text(d.valor.toString(), x + marginLeft + barWidth + 5, currentY + 3);
    
    currentY += barHeight + gap;
  });
}

export async function gerarPDFResultados(
  nomeLoja: string,
  dashboardData: DashboardData,
  analiseIA?: AnaliseIA | null
): Promise<Buffer> {
  const { kpis, complementares, alertas, periodoLabel, comparativoMesAnterior, resultados, ritmo, evolucao } = dashboardData;

  console.log('[PDF] Iniciando geração do PDF para', nomeLoja);
  console.log('[PDF] Evolução recebida:', evolucao?.length, 'itens');
  console.log('[PDF] Análise IA recebida:', analiseIA ? 'SIM' : 'NÃO', analiseIA);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        bufferPages: true 
      });
      
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;
      let currentY = 40;

      // ========== CABEÇALHO ==========
      // Logótipo ExpressGlass (incorporado em base64)
      try {
        const logoBuffer = Buffer.from(LOGO_BASE64, 'base64');
        const logoWidth = 150;
        const logoX = (doc.page.width - logoWidth) / 2;
        doc.image(logoBuffer, logoX, currentY, { width: logoWidth });
        currentY += 50;
        console.log('[PDF] Logótipo adicionado com sucesso');
      } catch (logoError) {
        console.log('[PDF] Erro ao carregar logótipo:', logoError);
      }

      doc.fontSize(18).fillColor('#1f2937');
      doc.text('Relatório de Resultados', 40, currentY, { align: 'center', width: pageWidth });
      currentY += 25;

      doc.fontSize(14).fillColor(verde);
      doc.text(nomeLoja, 40, currentY, { align: 'center', width: pageWidth });
      currentY += 20;

      doc.fontSize(10).fillColor('#6b7280');
      doc.text(`Período: ${periodoLabel}`, 40, currentY, { align: 'center', width: pageWidth });
      currentY += 12;
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-PT')}`, 40, currentY, { align: 'center', width: pageWidth });
      currentY += 25;

      // ========== KPIs PRINCIPAIS ==========
      doc.fontSize(12).fillColor('#1f2937');
      doc.text('Indicadores Principais', 40, currentY);
      currentY += 15;

      const kpiWidth = (pageWidth - 30) / 4;
      const kpiHeight = 50;
      const kpiColors = [azul, roxo, kpis.desvioObjetivoDiario >= 0 ? verde : vermelho, kpis.taxaReparacao >= 22 ? verde : laranja];
      const kpiLabels = ['Serviços', 'Objetivo', 'Desvio Obj. Diário', 'Taxa Reparação'];
      const kpiValues = [
        kpis.servicosRealizados.toString(),
        kpis.objetivoMensal.toString(),
        `${kpis.desvioObjetivoDiario >= 0 ? '+' : ''}${kpis.desvioObjetivoDiario.toFixed(1)}%`,
        `${kpis.taxaReparacao.toFixed(1)}%`
      ];

      for (let i = 0; i < 4; i++) {
        const kpiX = 40 + i * (kpiWidth + 10);
        doc.rect(kpiX, currentY, kpiWidth, kpiHeight).fill(kpiColors[i]);
        doc.fillColor('white').fontSize(8);
        doc.text(kpiLabels[i], kpiX + 5, currentY + 8, { width: kpiWidth - 10, align: 'center' });
        doc.fontSize(16);
        doc.text(kpiValues[i], kpiX + 5, currentY + 22, { width: kpiWidth - 10, align: 'center' });
      }
      currentY += kpiHeight + 15;

      // ========== ALERTAS ==========
      if (alertas && alertas.length > 0) {
        doc.fontSize(11).fillColor('#1f2937');
        doc.text('Alertas', 40, currentY);
        currentY += 12;

        alertas.forEach(alerta => {
          const alertColor = alerta.tipo === 'success' ? verde : alerta.tipo === 'warning' ? amarelo : vermelho;
          doc.fontSize(9).fillColor(alertColor);
          doc.text(`• ${alerta.mensagem}`, 48, currentY);
          currentY += 12;
        });
        currentY += 8;
      }

      // ========== RITMO PARA ATINGIR OBJETIVO ==========
      if (ritmo) {
        doc.fontSize(11).fillColor('#1f2937');
        doc.text('Ritmo para Atingir Objetivo', 40, currentY);
        currentY += 12;

        const ritmoBoxWidth = (pageWidth - 30) / 4;
        const ritmoBoxHeight = 45;
        
        const ritmoData = [
          { label: 'Serviços em Falta', valor: ritmo.servicosFaltam.toString(), cor: ritmo.servicosFaltam > 0 ? vermelho : verde },
          { label: 'Dias Úteis Rest.', valor: ritmo.diasUteisRestantes.toString(), cor: cinzaEscuro },
          { label: 'Serviços/Dia', valor: ritmo.servicosPorDia.toString(), cor: azul },
          { label: 'Gap Rep. 22%', valor: ritmo.gapReparacoes.toString(), cor: ritmo.gapReparacoes > 0 ? laranja : verde },
        ];

        ritmoData.forEach((item, i) => {
          const boxX = 40 + i * (ritmoBoxWidth + 10);
          doc.rect(boxX, currentY, ritmoBoxWidth, ritmoBoxHeight).fill(cinzaClaro);
          doc.fontSize(8).fillColor(cinzaEscuro);
          doc.text(item.label, boxX + 5, currentY + 6, { width: ritmoBoxWidth - 10, align: 'center' });
          doc.fontSize(14).fillColor(item.cor);
          doc.text(item.valor, boxX + 5, currentY + 22, { width: ritmoBoxWidth - 10, align: 'center' });
        });
        currentY += ritmoBoxHeight + 15;
      }

      // ========== VENDAS COMPLEMENTARES ==========
      doc.fontSize(11).fillColor('#1f2937');
      doc.text('Vendas Complementares', 40, currentY);
      currentY += 12;

      const compWidth = (pageWidth - 40) / 5;
      const compHeight = 45;
      const compData = [
        { label: 'Escovas', valor: complementares.escovasQtd, percent: complementares.escovasPercent },
        { label: 'Polimento', valor: complementares.polimentoQtd },
        { label: 'Tratamento', valor: complementares.tratamentoQtd },
        { label: 'Lavagens', valor: complementares.lavagensTotal },
        { label: 'Outros', valor: complementares.outrosQtd },
      ];

      compData.forEach((item, i) => {
        const boxX = 40 + i * (compWidth + 10);
        doc.rect(boxX, currentY, compWidth, compHeight).fill(cinzaClaro);
        doc.fontSize(8).fillColor(cinzaEscuro);
        doc.text(item.label, boxX + 3, currentY + 6, { width: compWidth - 6, align: 'center' });
        doc.fontSize(14).fillColor('#1f2937');
        doc.text(item.valor.toString(), boxX + 3, currentY + 20, { width: compWidth - 6, align: 'center' });
        if (item.percent !== undefined && item.percent !== null) {
          doc.fontSize(7).fillColor(item.percent >= 0.10 ? verde : item.percent >= 0.075 ? amarelo : vermelho);
          doc.text(`(${(item.percent * 100).toFixed(1)}%)`, boxX + 3, currentY + 35, { width: compWidth - 6, align: 'center' });
        }
      });
      currentY += compHeight + 15;

      // ========== BARRA DE PROGRESSO ESCOVAS ==========
      doc.fontSize(11).fillColor('#1f2937');
      doc.text('Progresso Escovas (Objetivo: 10%)', 40, currentY);
      currentY += 12;

      const barraWidth = pageWidth;
      const barraHeight = 20;
      const escovasPercent = complementares.escovasPercent !== null ? complementares.escovasPercent * 100 : 0;
      
      // Fundo da barra
      doc.rect(40, currentY, barraWidth, barraHeight).fill(cinzaClaro);
      
      // Barra de progresso
      const progressWidth = Math.min((escovasPercent / 15) * barraWidth, barraWidth);
      const progressColor = escovasPercent >= 10 ? verde : escovasPercent >= 7.5 ? amarelo : vermelho;
      doc.rect(40, currentY, progressWidth, barraHeight).fill(progressColor);
      
      // Marcadores
      const marker75 = (7.5 / 15) * barraWidth;
      const marker10 = (10 / 15) * barraWidth;
      doc.strokeColor(cinzaEscuro).lineWidth(2);
      doc.moveTo(40 + marker75, currentY).lineTo(40 + marker75, currentY + barraHeight).stroke();
      doc.moveTo(40 + marker10, currentY).lineTo(40 + marker10, currentY + barraHeight).stroke();
      
      // Labels dos marcadores
      doc.fontSize(7).fillColor(cinzaEscuro);
      doc.text('7.5%', 40 + marker75 - 10, currentY + barraHeight + 2);
      doc.text('10%', 40 + marker10 - 8, currentY + barraHeight + 2);
      
      // Valor atual
      doc.fontSize(9).fillColor('white');
      doc.text(`${escovasPercent.toFixed(1)}%`, 40 + progressWidth - 30, currentY + 4);
      
      currentY += barraHeight + 20;

      // ========== COMPARATIVO COM MÊS ANTERIOR ==========
      doc.fontSize(11).fillColor('#1f2937');
      doc.text('Comparativo com Mês Anterior', 40, currentY);
      currentY += 12;

      const compMesWidth = (pageWidth - 20) / 3;
      const compMesHeight = 55;
      
      // Serviços
      doc.rect(40, currentY, compMesWidth, compMesHeight).fill(cinzaClaro);
      doc.fillColor(cinzaEscuro).fontSize(9);
      doc.text('Serviços', 48, currentY + 6);
      doc.fontSize(14);
      doc.text(`${kpis.servicosRealizados} (ant: ${comparativoMesAnterior.servicosAnterior})`, 48, currentY + 20);
      if (comparativoMesAnterior.variacaoServicos !== null) {
        const varColor = comparativoMesAnterior.variacaoServicos >= 0 ? verde : vermelho;
        const varIcon = comparativoMesAnterior.variacaoServicos >= 0 ? '↑' : '↓';
        doc.fontSize(10).fillColor(varColor);
        doc.text(`${varIcon} ${Math.abs(comparativoMesAnterior.variacaoServicos).toFixed(1)}%`, 48, currentY + 38);
      }
      
      // Reparações
      doc.rect(40 + compMesWidth + 10, currentY, compMesWidth, compMesHeight).fill(cinzaClaro);
      doc.fillColor(cinzaEscuro).fontSize(9);
      doc.text('Reparações', 48 + compMesWidth + 10, currentY + 6);
      doc.fontSize(14);
      doc.text(`${resultados.totalReparacoes} (ant: ${comparativoMesAnterior.reparacoesAnterior})`, 48 + compMesWidth + 10, currentY + 20);
      if (comparativoMesAnterior.variacaoReparacoes !== null) {
        const varColor = comparativoMesAnterior.variacaoReparacoes >= 0 ? verde : vermelho;
        const varIcon = comparativoMesAnterior.variacaoReparacoes >= 0 ? '↑' : '↓';
        doc.fontSize(10).fillColor(varColor);
        doc.text(`${varIcon} ${Math.abs(comparativoMesAnterior.variacaoReparacoes).toFixed(1)}%`, 48 + compMesWidth + 10, currentY + 38);
      }
      
      // Escovas
      doc.rect(40 + (compMesWidth + 10) * 2, currentY, compMesWidth, compMesHeight).fill(cinzaClaro);
      doc.fillColor(cinzaEscuro).fontSize(9);
      doc.text('Escovas', 48 + (compMesWidth + 10) * 2, currentY + 6);
      doc.fontSize(14);
      doc.text(`${complementares.escovasQtd} (ant: ${comparativoMesAnterior.escovasAnterior})`, 48 + (compMesWidth + 10) * 2, currentY + 20);
      if (comparativoMesAnterior.variacaoEscovas !== null) {
        const varColor = comparativoMesAnterior.variacaoEscovas >= 0 ? verde : vermelho;
        const varIcon = comparativoMesAnterior.variacaoEscovas >= 0 ? '↑' : '↓';
        doc.fontSize(10).fillColor(varColor);
        doc.text(`${varIcon} ${Math.abs(comparativoMesAnterior.variacaoEscovas).toFixed(1)}%`, 48 + (compMesWidth + 10) * 2, currentY + 38);
      }
      
      currentY += compMesHeight + 20;

      // ========== ANÁLISE IA (na página 1) ==========
      if (analiseIA) {
        console.log('[PDF] A adicionar análise IA na página 1...');
        
        // Verificar se precisa de nova página
        if (currentY > 600) {
          doc.addPage();
          currentY = 40;
        }
        
        doc.fontSize(12).fillColor('#1f2937');
        doc.text('Análise Inteligente', 40, currentY);
        currentY += 15;

        // Foco Urgente
        if (analiseIA.focoUrgente && analiseIA.focoUrgente.length > 0) {
          doc.fontSize(10).fillColor(vermelho);
          doc.text('🎯 Foco Urgente:', 40, currentY);
          currentY += 12;
          analiseIA.focoUrgente.forEach(item => {
            doc.fontSize(9).fillColor(cinzaEscuro);
            doc.text(`• ${item}`, 50, currentY, { width: pageWidth - 20 });
            currentY += doc.heightOfString(`• ${item}`, { width: pageWidth - 20 }) + 4;
          });
          currentY += 8;
        }

        // Pontos Positivos
        if (analiseIA.pontosPositivos && analiseIA.pontosPositivos.length > 0) {
          doc.fontSize(10).fillColor(verde);
          doc.text('✅ Pontos Positivos:', 40, currentY);
          currentY += 12;
          analiseIA.pontosPositivos.forEach(item => {
            doc.fontSize(9).fillColor(cinzaEscuro);
            doc.text(`• ${item}`, 50, currentY, { width: pageWidth - 20 });
            currentY += doc.heightOfString(`• ${item}`, { width: pageWidth - 20 }) + 4;
          });
          currentY += 8;
        }

        // Resumo
        if (analiseIA.resumo) {
          doc.fontSize(10).fillColor(azul);
          doc.text('💬 Resumo:', 40, currentY);
          currentY += 12;
          doc.fontSize(9).fillColor(cinzaEscuro);
          doc.text(analiseIA.resumo, 50, currentY, { width: pageWidth - 20 });
          currentY += doc.heightOfString(analiseIA.resumo, { width: pageWidth - 20 }) + 10;
        }
        
        console.log('[PDF] Análise IA adicionada na página 1');
      }

      // ========== GRÁFICOS DE EVOLUÇÃO MENSAL (página 2 - só se houver dados) ==========
      if (evolucao && evolucao.length > 0) {
        console.log('[PDF] A desenhar gráficos de evolução...');
        
        // Nova página para gráficos
        doc.addPage();
        currentY = 40;
        
        doc.fontSize(14).fillColor('#1f2937');
        doc.text('Evolução Mensal (Gráficos)', 40, currentY, { align: 'center', width: pageWidth });
        currentY += 25;

        // Preparar dados para gráficos
        const dadosServicos = evolucao.slice(0, 6).map(e => ({
          label: `${mesesNomes[e.mes - 1]}/${String(e.ano).slice(2)}`,
          valor1: Number(e.totalServicos) || 0,
          valor2: Number(e.objetivoMensal) || 0
        }));

        const dadosDesvio = evolucao.slice(0, 6).map(e => {
          const servicos = Number(e.totalServicos) || 0;
          const objetivo = Number(e.objetivoMensal) || 1;
          return {
            label: `${mesesNomes[e.mes - 1]}/${String(e.ano).slice(2)}`,
            valor: ((servicos - objetivo) / objetivo) * 100
          };
        });

        const dadosTaxa = evolucao.slice(0, 6).map(e => {
          const servicos = Number(e.totalServicos) || 1;
          const reparacoes = Number(e.qtdReparacoes) || 0;
          return {
            label: `${mesesNomes[e.mes - 1]}/${String(e.ano).slice(2)}`,
            valor: (reparacoes / servicos) * 100
          };
        });

        // Gráfico 1: Serviços vs Objetivo
        desenharGraficoBarras(doc, 40, currentY, pageWidth, 180, dadosServicos, 'Serviços vs Objetivo', 'Serviços', 'Objetivo', azul, roxo);
        currentY += 190;

        // Gráfico 2: Desvio %
        desenharGraficoDesvio(doc, 40, currentY, pageWidth, 180, dadosDesvio, 'Desvio % (Serviços vs Objetivo)');
        currentY += 190;

        // Gráfico 3: Taxa de Reparação (nova página se necessário)
        if (currentY > 550) {
          doc.addPage();
          currentY = 40;
        }
        desenharGraficoLinha(doc, 40, currentY, pageWidth, 180, dadosTaxa, 'Taxa de Reparação (%)', verde, 22, '%');
        currentY += 190;

        // Gráfico 4: Vendas Complementares
        if (currentY > 500) {
          doc.addPage();
          currentY = 40;
        }
        desenharGraficoComplementares(doc, 40, currentY, pageWidth, 180, complementares, 'Distribuição de Vendas Complementares');
        currentY += 190;
        
        console.log('[PDF] Gráficos desenhados com sucesso');
      } else {
        console.log('[PDF] Sem dados de evolução - gráficos não serão gerados');
      }

      // ========== RODAPÉ ==========
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#9ca3af');
        doc.text(
          `PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass | Página ${i + 1} de ${totalPages}`,
          40,
          doc.page.height - 30,
          { align: 'center', width: pageWidth }
        );
      }

      doc.end();
      console.log('[PDF] PDF finalizado');
    } catch (error) {
      console.error('[PDF] Erro ao gerar PDF:', error);
      reject(error);
    }
  });
}
