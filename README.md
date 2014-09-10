# Eisenhower

*Eisenhower* lets you manage tasks using the
[Eisenhower Method](http://en.wikipedia.org/wiki/Time_management#The_Eisenhower_Method)
.

## Usage

Check out the
[live demo](http://nounch.github.io/eisenhower)
.

You can also use it locally or on a server with either of those options:

1. Open `index.html` in a browser. Since *Eisenhower* currently
   uses `localStorage` only, the recent versions of all major
   (desktop) browsers consider the file path to be a sufficient
   replacement for a domain when opened locally (CORS), so browser
   storage contents are persisted (when the browser is configured to
   do so, i.e. no Incognito Mode, plugins fiddling with `localStorage`
   etc.).

2. Statically host `index.html` and all assets in the `public`
   directory along with it. In recent enough browsers this works
   when serving locally only, too.

## Features

- Multiple projects
- Move tasks between projects
- Add/edit/remove descriptions
- Dates are automatically added to tasks on creation
- Select/unselect tasks
- Delete all selected tasks
- Delete individual tasks
- Delete projects
- Import/export all projects and tasks (so you can put your data under
  version control)
- Statistics page
- Rename tasks
- Rename projects
- Info page built right-in ("Help" button or "Info" button in the
  "Options" menu)
- When removing the last project, *Eisenhower* will automatically
  generate an "Intro" and an "Example Project" so you don't get
  lost. Those can be removed just like any other project ("Remove
  current project" in the "Options" menu).

## Storage

At the moment, *Eisenhower* uses `localStorage` to store
projects. Every action changing data causes the app to completely
replace **all** projects in `localStorage`. This is no problem when
there is not an unreasonably large number of projects (Remember: With
the
[EisenhowerMethod](http://en.wikipedia.org/wiki/Time_management#The_Eisenhower_Method)
the final goal is to remove all tasks from a project.) or when
projects have unreasonably large descriptions (If this is the case,
you should probably use a real project management tool with the option
to attach files etc.). This happens with a
call to `self.app.saveProjects`.

The top level object containing all projects and tasks as an hierarchy
of objects (models + views) is `self.app.projectListView`.

It is possible to replace or supplement this storage mechanism with
GET/POST/PUT/PATCH/... calls to an API. In this case, one might
consider to manually track task-project associations etc. using
explicite IDs on all objects involved. In this case it might make
sense to not use a hierarchically nested data structure at all
(described above).

## Tech
- Underscore
- Backbone
- jQuery
- jQuery UI (drag & drop)
- Bootstrap (CSS, not JS)

Go check out the
[live demo](http://nounch.github.io/eisenhower)
.
