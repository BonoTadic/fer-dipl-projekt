
--function which gets all students which have this professor as mentor in their odabir table
drop function if exists get_students_by_mentor;
create or replace function get_students_by_mentor(profesor_id int) returns table (
    student_id int,
    ime varchar,
    prezime varchar,
    datum_rodjenja date,
    mjesto_rodjenja_pbr int,
    adresa varchar,
    broj_telefona varchar,
    email varchar,
    spol varchar,
    jmbag varchar
) as $$
begin
    return query
    select s.id, s.ime, s.prezime, s.datum_rodjenja, s.mjesto_rodjenja_pbr, s.adresa, s.broj_telefona, s.email, s.spol, s.jmbag
    from projekt.student s
    join projekt.student_odabir so on s.id = so.student_id
    where so.mentor_id = profesor_id;
end;
$$ language plpgsql;

--funciton which gets the list off all mentors
drop function if exists get_mentors;
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
drop function if exists get_mentors_by_student;
create or replace function get_mentors_by_student(id_studenta int) returns table (
    profesor_id int,
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
    from projekt.profesor p
    join projekt.student_odabir so on p.id = so.profesor_id
    where so.student_id = id_studenta;
end;
$$ language plpgsql;

--trigger to check if student odabir has no more than 10 mentors selected
drop function if exists check_mentor_count on projekt.student_odabir;
create or replace function check_mentor_count() returns trigger as $$
begin
    if (select count(*) from projekt.student_odabir where student_id = new.student_id) > 10 then
        raise exception 'Student can have no more than 10 mentors';
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists check_mentor_count_trigger on projekt.student_odabir;
create trigger check_mentor_count_trigger
before insert or update on projekt.student_odabir
for each row
execute function check_mentor_count();

