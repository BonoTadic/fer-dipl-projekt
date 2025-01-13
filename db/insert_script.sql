-- Insert random rows into mjesto
insert into projekt.mjesto (id, naziv, pbr)
select i, 'Mjesto ' || i, 10000 + i
from generate_series(1, 50) as i;


select * from projekt.student

-- Insert random rows into student
insert into projekt.student (ime, prezime, datum_rodjenja, mjesto_rodjenja_pbr, adresa, broj_telefona, email, spol, jmbag)
select 
    'StudentIme' || i,
    'StudentPrezime' || i,
    date '1995-01-01' + (random() * 10000)::int,
    (select pbr from projekt.mjesto order by random() limit 1),
    'Adresa ' || i,
    '098' || (random() * 10000000)::int,
    'student' || i || '@example.com',
    case when random() > 0.5 then 'M' else 'F' end,
    lpad((random() * 1000000000)::int::text, 10, '0')
from generate_series(1, 100) as i;

-- Insert random rows into profesor
insert into projekt.profesor (ime, prezime, datum_rodjenja, mjesto_rodjenja_pbr, adresa, broj_telefona, email, zvanje)
select 
    'ProfesorIme' || i,
    'ProfesorPrezime' || i,
    date '1970-01-01' + (random() * 10000)::int,
    (select pbr from projekt.mjesto order by random() limit 1),
    'Adresa ' || i,
    '099' || (random() * 10000000)::int,
    'profesor' || i || '@example.com',
    'ProfesorZvanje ' || i
from generate_series(1, 20) as i;

-- Insert random rows into predmet
insert into projekt.predmet (naziv, ects, semestar)
select 
    'Predmet ' || i,
    5 + (random() * 3)::int,
    (random() * 5 + 1)::int
from generate_series(1, 30) as i;

-- Insert rows into student_odabir with proper ranking
do $$
declare
    student_id int;
    mentor_ids int[];
    mentor_id int;  -- Declare the variable for use in FOREACH
    i int := 0;
begin
    for student_id in select id from projekt.student loop
        -- Randomly select mentors for the student (up to 10 mentors)
        mentor_ids := array(
            select id from projekt.profesor order by random() limit (random() * 10)::int + 1
        );

        -- Assign ranks starting at 0
        i := 0;
        foreach mentor_id in array mentor_ids loop
            begin
                insert into projekt.student_odabir (student_id, mentor_id, rank)
                values (student_id, mentor_id, i);
                i := i + 1;
            exception when others then
                -- Skip if there's a conflict (e.g., unique constraint or trigger)
                continue;
            end;
        end loop;
    end loop;
end $$;

select * from projekt.student_odabir


-- Insert rows into mentor_odabir with proper ranking and priority set to false
do $$
declare
    mentor_id int;
    student_ids int[];
    student_id int;  -- Declare the variable for use in FOREACH
    i int := 0;
begin
    for mentor_id in select id from projekt.profesor loop
        -- Randomly select students for the mentor (up to 10 students)
        student_ids := array(
            select id from projekt.student order by random() limit (random() * 10)::int + 1
        );

        -- Assign ranks starting at 0, and set priority to false
        i := 0;
        foreach student_id in array student_ids loop
            begin
                insert into projekt.mentor_odabir (student_id, profesor_id, rank, prioritet)
                values (student_id, mentor_id, i, false);
                i := i + 1;
            exception when others then
                -- Skip if there's a conflict (e.g., unique constraint or trigger)
                continue;
            end;
        end loop;
    end loop;
end $$;


