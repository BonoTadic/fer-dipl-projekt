--function which gets all students which have this professor as mentor in their odabir table
--drop function if exists get_students_by_mentor;
-- DROP FUNCTION projekt.get_students_by_mentor(int4);

CREATE OR REPLACE FUNCTION projekt.get_students_by_mentor(id_profesora integer)
 RETURNS TABLE(student_id integer, ime character varying, prezime character varying, datum_rodjenja date, mjesto_rodjenja_pbr integer, adresa character varying, broj_telefona character varying, email character varying, spol character varying, jmbag character varying, rank integer)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    select s.id, s.ime, s.prezime, s.datum_rodjenja, s.mjesto_rodjenja_pbr, s.adresa, s.broj_telefona, s.email, s.spol, s.jmbag, mo.rank
    from projekt.student s
    join projekt.mentor_odabir mo on s.id = mo.student_id
    where mo.profesor_id = id_profesora
	order by mo.rank asc;
end;
$function$
;


--funciton which gets the list off all mentors
--drop function if exists get_mentors;
create or replace function get_mentors() returns table (
    id int,
    ime varchar,
    prezime varchar,
    datum_rodjenja date,
    mjesto_rodjenja_pbr int,
    adresa varchar,
    broj_telefona varchar,
    email varchar
) as $$
begin
    return query
    select p.id, p.ime, p.prezime, p.datum_rodjenja, p.mjesto_rodjenja_pbr, p.adresa, p.broj_telefona, p.email
    from projekt.profesor p;
end;
$$ language plpgsql;

--function which gets all mentors which student has in his odabir table
-- DROP FUNCTION projekt.get_mentors_by_student(int4);

CREATE OR REPLACE FUNCTION projekt.get_mentors_by_student(id_studenta integer)
 RETURNS TABLE(profesor_id integer, ime character varying, prezime character varying, datum_rodjenja date, mjesto_rodjenja_pbr integer, adresa character varying, broj_telefona character varying, email character varying, rank integer)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    select p.id, p.ime, p.prezime, p.datum_rodjenja, p.mjesto_rodjenja_pbr, p.adresa, p.broj_telefona, p.email, so.rank
    from projekt.profesor p
    join projekt.student_odabir so on p.id = so.profesor_id
    where so.student_id = id_studenta
	order by so.rank asc;
end;
$function$
;


--trigger to check if student odabir has no more than 10 mentors selected
--drop function if exists check_mentor_count;
create or replace function check_mentor_count() returns trigger as $$
begin
    if (select count(*) from projekt.student_odabir where student_id = new.student_id) > 10 then
        raise exception 'Student can have no more than 10 mentors';
    end if;
    return new;
end;
$$ language plpgsql;

--drop trigger if exists check_mentor_count_trigger on projekt.student_odabir;
create trigger check_mentor_count_trigger
before insert or update on projekt.student_odabir
for each row
execute function check_mentor_count();

--trigger to add mentor_odabir rows when student_odabir row is added rank should be current highest rank + 1
--drop function if exists add_mentor_odabir;
create or replace function add_mentor_odabir() returns trigger as $$
declare
    max_rank int;
begin
    select COALESCE(max(rank), 0) into max_rank from projekt.mentor_odabir where profesor_id = new.profesor_id;
    insert into projekt.mentor_odabir (student_id, profesor_id, rank, prioritet) values (new.student_id, new.profesor_id, max_rank + 1, false);
    return new;
end;
$$ language plpgsql;

--drop trigger if exists add_mentor_odabir_trigger on projekt.student_odabir;
create trigger add_mentor_odabir_trigger
after insert on projekt.student_odabir
for each row
execute function add_mentor_odabir();


--trigger to delete mentor_odabir rows when student_odabir row is deleted
--drop function if exists delete_mentor_odabir;
create or replace function delete_mentor_odabir() returns trigger as $$
begin
    delete from projekt.mentor_odabir where student_id = old.student_id and profesor_id = old.profesor_id;
    return old;
end;
$$ language plpgsql;

--drop trigger if exists delete_mentor_odabir_trigger on projekt.student_odabir;
create trigger delete_mentor_odabir_trigger
after delete on projekt.student_odabir
for each row
execute function delete_mentor_odabir();

--trigger to adjust ranks of all mentor_odabir rows after a row is deleted, aka if we delete rank 3 all of the others which are ranks 4 and above should be subtracted by 1
--drop function if exists adjust_mentor_odabir;
create or replace function adjust_mentor_odabir() returns trigger as $$
declare
    rank_to_adjust int;
begin
    rank_to_adjust := old.rank;
    update projekt.mentor_odabir
    set rank = rank - 1
    where profesor_id = old.profesor_id and rank > rank_to_adjust;
    return old;
end;
$$ language plpgsql;

--the trigger
--drop trigger if exists adjust_mentor_odabir_trigger on projekt.mentor_odabir;
create trigger adjust_mentor_odabir_trigger
after delete on projekt.mentor_odabir
for each row
execute function adjust_mentor_odabir();




--update function for mentor_odabir it takes a list of all the studetnts and updated ranks
--drop function if exists update_mentor_odabir;
create or replace function update_mentor_odabir(id_profesora int, id_studenta int, new_rank int) returns void as $$
begin
    update projekt.mentor_odabir
    set rank = new_rank
    where student_id = id_studenta and profesor_id = id_profesora;
end;
$$ language plpgsql;


--update or insert new rows in student_odabir
--drop function if exists update_student_odabir;
create or replace function update_student_odabir(id_studenta int, id_profesora int, new_rank int) returns void as $$
begin
    if exists (select * from projekt.student_odabir where student_id = id_studenta and profesor_id = id_profesora) then
        update projekt.student_odabir
        set rank = new_rank
        where student_id = id_studenta and profesor_id = id_profesora;
    else
        insert into projekt.student_odabir (student_id, profesor_id, rank) values (id_studenta, id_profesora, new_rank);
    end if;
end;
$$ language plpgsql;



--funciton which gets all subjects that a specific mentor has selected
--DROP FUNCTION projekt.get_subjects_by_mentor(int4);
create or replace function projekt.get_subjects_by_mentor(id_profesora integer)
    returns table (predmet_id integer, naziv varchar) as $$
begin
    return query
    select pp.predmet_id, p.naziv
    from projekt.profesor_predmet pp
    join projekt.predmet p on pp.predmet_id = p.id
    where pp.profesor_id = id_profesora;
end;
$$ language plpgsql;