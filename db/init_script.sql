--drop schema if exists projekt cascade;
CREATE SCHEMA projekt;

--drop table if exists projekt.mjesto;
create table projekt.mjesto (
    id INT PRIMARY KEY,
    naziv varchar(255) not null,
    pbr int not null unique
);

--drop table if exists projekt.student;
create table projekt.student (
    id SERIAL PRIMARY KEY,
    ime varchar(255) not null,
    prezime varchar(255) not null,
    datum_rodjenja date not null,
    mjesto_rodjenja_pbr int not null,
    adresa varchar(255) not null,
    broj_telefona varchar(255) not null,
    email varchar(255) not null,
    spol varchar(1) not null,
    jmbag varchar(10) not null,
    foreign key (mjesto_rodjenja_pbr) references projekt.mjesto(pbr)
);

-- drop table if exists projekt.predmet;
create table projekt.predmet (
    id SERIAL PRIMARY KEY,
    naziv varchar(255) not null,
    ects int not null,
    semestar int not null
);

alter table projekt.predmet add constraint semestar_enum check (semestar in (1, 2, 3, 4, 5, 6));

-- drop table if exists projekt.predmet_student;
create table projekt.predmet_student(
    student_id int not null,
    predmet_id int not null,
    ocjena int null,
    upis varchar(10) not null,
    primary key (student_id, predmet_id),
    foreign key (student_id) references projekt.student(id),
    foreign key (predmet_id) references projekt.predmet(id)
);

alter TABLE projekt.predmet_student add constraint ocjena_enum check (ocjena in (1, 2, 3, 4, 5));
alter table projekt.predmet_student add constraint status_enum check (upis in ('obavljen', 'upisan'));

-- drop table if exists projekt.profesor;
create table projekt.profesor (
    id SERIAL PRIMARY KEY,
    ime varchar(255) not null,
    prezime varchar(255) not null,
    datum_rodjenja date not null,
    mjesto_rodjenja_pbr int not null,
    adresa varchar(255) not null,
    broj_telefona varchar(255) not null,
    email varchar(255) not null,
    zvanje varchar(255) not null,
    foreign key (mjesto_rodjenja_pbr) references projekt.mjesto(pbr)
);

-- drop table if exists projekt.mentor_odabir;
create table projekt.mentor_odabir (
    student_id int not null,
    profesor_id int not null,
    rank int not null,
    prioritet boolean not null,
    primary key (student_id, profesor_id),
    foreign key (student_id) references projekt.student(id),
    foreign key (profesor_id) references projekt.profesor(id)
);

-- check if rank is >= 0
alter table projekt.mentor_odabir add constraint rank_enum check (rank >= 0);  

-- drop table if exists projekt.student_odabir;
create table projekt.student_odabir (
    student_id int not null,
    profesor_id int not null,
    rank int not null,
    primary key (student_id, profesor_id),
    foreign key (student_id) references projekt.student(id),
    foreign key (profesor_id) references projekt.profesor(id)
);

-- check if rank is >= 0
alter table projekt.student_odabir add constraint rank_enum check (rank >= 0);

-- drop table if  exists projekt.profesor_predmet;
create table projekt.profesor_predmet (
    profesor_id int not null,
    predmet_id int not null,
    primary key (profesor_id, predmet_id),
    foreign key (profesor_id) references projekt.profesor(id),
    foreign key (predmet_id) references projekt.predmet(id)
);