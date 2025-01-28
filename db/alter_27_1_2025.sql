--add add column kapacitet to table profesor
ALTER TABLE profesor ADD COLUMN kapacitet INTEGER;
--set all values of kapacitet to 3;
UPDATE profesor SET kapacitet = 3;

create or replace function get_kapacitet(id integer) returns integer as $$
declare
    kapacitet integer;
begin
    select kapacitet into kapacitet from profesor where id = $1;
    return kapacitet;
end;
$$ language plpgsql;

create or replace function set_kapacitet(id integer, kapacitet integer) returns void as $$
begin
    update profesor set kapacitet = $2 where id = $1;
end;
$$ language plpgsql;

