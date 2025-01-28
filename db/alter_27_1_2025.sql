--add add column kapacitet to table profesor
ALTER TABLE profesor ADD COLUMN kapacitet INTEGER;
--set all values of kapacitet to 3;
UPDATE profesor SET kapacitet = 3;

create or replace function projekt.get_kapacitet(id_in integer) returns integer as $$
declare
    kapacitet_out integer;
begin
    select kapacitet into kapacitet_out from projekt.profesor where id = $1;
    return kapacitet_out;
end;
$$ language plpgsql;

create or replace function projekt.set_kapacitet(id_in integer, kapacitet_in integer) returns void as $$
begin
    update projekt.profesor set kapacitet = $2 where id = $1;
end;
$$ language plpgsql;

