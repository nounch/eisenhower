$(document).ready(function() {

  var self = this;

  // Make views removable
  Backbone.View.prototype.close = function() {
    this.remove();
    this.unbind();
  };

  self.names = {
    mainContentId: 'main-content',
    newTaskInputId: 'new-task-input',

    taskViewTemplateId: 'task-view-template',
    taskListViewTemplateId: 'task-list-view-template',
    projectListItemTemplateId: 'project-list-item-template',

    taskViewClass: 'task-view',
    taskViewDataAttributeTaskId: 'data-task-id',
    taskListViewClass: 'task-list-view',
    projectListViewId: 'project-list-view',
    projectListViewAnchorId: 'projects-list-anchor',
    projectListItemClass: 'project-list-item',
    addProjectInputId: 'add-project-input',
    taskSelectionToggleClass: 'task-selection-toggle',

    urgentImportantListId: 'urgent-important-list',
    urgentNotImportantListId: 'urgent-not-important-list',
    notUrgentImportantListId: 'not-urgent-important-list',
    notUrgentNotImportantListId: 'not-urgent-not-important-list',

    draggedElementClass: 'currently-dragged-element',

    removeTaskButtonClass: 'remove-task-button',
    removeSelectedButtonClass: 'remove-selected-button',

    removeCurrentProjectButtonClass: 'remove-current-project-button',
    currentProjectClass: 'current-project',
    projectListItemDataAttributeId: 'data-project-id',

    invisible: 'invisible',
  }


  // Make a project droppable.
  self.originalDroppableBackgroundColor = null;
  self.makeProjectDroppable = function(project) {
    $(project.$el).droppable({
      drop: function(event, ui) {
        $(this).css({
          'background-color': self.originalDroppableBackgroundColor,
        });
        var projectCid = $(this).find('a').attr(
          self.names.projectListItemDataAttributeId);
        var taskCid = $(ui.draggable).attr(
          self.names.taskViewDataAttributeTaskId)

        // Do nothing, if the target is the current project.
        if (projectCid != self.app.currentProject.cid) {
          var movedTask = null;

          // Search all taks lists and remove the task from its current one.
          // (Not important here, but for huge lists this could potentially
          // be faster than speculatively calling Backbone's `remove' on all
          // of them. Not verified! In any case, it allows for additional or
          // less task lists in the future.).
          var keys = Object.keys(self.app.taskLists);
          _.each(keys, function(key) {
            var taskList = self.app.taskLists[key];
            taskList.model.each(function(task) {
              if (task.cid == taskCid) {
                movedTask = task;
                taskList.model.remove(taskCid);
              }
            });
          });

          // Remove the DOM element. This is more efficient than
          // rerendering the whole current project.
          $(ui.draggable).remove();

          // Add the task to its new project (target project).
          var targetProject = self.app.projectListView.model
            .findWhere({cid: projectCid});

          self.app.norender = true;
          targetProject.attributes.urgentImportantTaskList
            .unshift(movedTask);
          self.app.norender = false;
        }

      },
      over: function(event, ui) {
        // This timeout is coordinated with the `out' timeout and prevents
        // the dragged elemnt to accidentially have the wront styleing when
        // moving the cursor too fast.
        setTimeout(function() {
          $(ui.draggable).css({
            'opacity': '0.25',
          });
        }, 20);
        self.originalDroppableBackgroundColor = $(this)
          .css('background-color');
        $(this).css({
          'background-color': '#CDCDCD',
        });
      },
      out: function(event, ui) {
        // This timeout is coordinated with the `over' timeout and prevents
        // the dragged elemnt to accidentially have the wront styleing when
        // moving the cursor too fast.
        setTimeout(function() {
          $(ui.draggable).css({
            'opacity': '1.0',
          });
        }, 10);

        $(this).css({
          'background-color': self.originalDroppableBackgroundColor,
        });
      },
    });
  };


  //=======================================================================
  // Models + Collections
  //=======================================================================

  self.Task = Backbone.Model.extend({
    defaults: {
      name: '',
      selected: false,
    },
  });

  // Collection

  self.TaskCollection = Backbone.Collection.extend({
    model: self.Task,
  });

  self.Project = Backbone.Model.extend({
    defaults: {
      name: '',
      urgentImportantTaskList: new self.TaskCollection([]),
      urgentNotImportantTaskList: new self.TaskCollection([]),
      notUrgentImportantTaskList: new self.TaskCollection([]),
      notUrgentNotImportantTaskList: new self.TaskCollection([]),
    },
  });

  // Collection

  self.ProjectList = Backbone.Collection.extend({
    model: self.Project,
  });


  //=======================================================================
  // Views
  //=======================================================================

  self.TaskView = Backbone.View.extend({
    tagName: 'div',
    className: self.names.taskViewClass,
    initialize: function(options) {
      // The element to which the view should be appended.
      this.element = options['element'];

      // Bind events.
      this.events['click .' + self.names.removeTaskButtonClass] =
        'removeThisTask';
      this.events['click .' + self.names.taskSelectionToggleClass] =
        'toggleSelected';

      this.$el.attr(self.names.taskViewDataAttributeTaskId, this.model.cid);
    },
    events: {
      'drop': 'drop',
    },
    drop: function(e, options) {
      var index = options['index'] || 0;
      var newList = options['list'];
      var oldList = self.app.taskLists[self.app.dragSourceTaskList];
      // Remove the view from the old list.
      oldList.model.remove(this.model);
      // Add the view from the new list.
      newList.model.add(this.model, {at: index});
    },
    removeThisTask: function() {
      var that = this;
      // Animate the element.
      this.$el.animate({
        'opacity': '0.001',
      }, 'fast', function() {
        that.$el.slideUp(function() {
          // Actually remove the element.
          that.$el.remove();
        });
      });
      self.app.trigger('remove:task', this.model.cid);
    },
    toggleSelected: function() {
      this.model.set({selected: !this.model.get('selected')})
    },
    template: function(data) {
      return _.template($('#' + self.names.taskViewTemplateId)
                        .html(), data.toJSON());
    },
    render: function() {
      this.$el.html(this.template(this.model));
      if (this.element) {  // Be extra-cautious.
        this.element.append(this.$el);
      }
      return this;
    },
  });

  self.TaskListView = Backbone.View.extend({
    tagName: 'div',
    className: self.names.taskListViewClass,
    initialize: function(options) {
      var that = this;
      this.name = options['name'];

      // Events
      this.listenTo(this.model, 'add', function(e) {
        // Only render if this should be rendered (i.e. if the list is part
        // of the current project).
        if (!self.app.norender) {
          this.render();
        }
      });
    },
    template: function(data) {
      return _.template($('#' + self.names.taskListViewTemplateId)
                        .html(), data);
    },
    render: function() {
      var that = this;

      // Append the the right container.
      var id = '';
      if (this.name == self.names.urgentImportantListId) {
        id = self.names.urgentImportantListId;
      } else if (this.name == self.names.urgentNotImportantListId) {
        id = self.names.urgentNotImportantListId;
      } else if (this.name == self.names.notUrgentImportantListId) {
        id = self.names.notUrgentImportantListId;
      } else if (this.name == self.names.notUrgentNotImportantListId) {
        id = self.names.notUrgentNotImportantListId;
      }
      var container = $('#' + id);
      container.empty();
      // Do not append this element itself, but do append the subviews.
      // So do NOT do this:
      //
      // container.append(this.$el.html());

      this.model.each(function(task) {
        // Append the subview HTML to this parent view by making the
        // subview append itself when given a handle to the parent view
        // element.
        new self.TaskView({model: task, element: $('#' + id)}).render();
      });

      return this;
    },
    addTaskAtIndex: function(task, index) {

    },
  });

  self.ProjectView = Backbone.View.extend({
    tagName: 'div',
    className: self.names.projectListItemClass,
    events: {
      'click': 'showThisProject',
    },
    initialize: function() {
      self.makeProjectDroppable(this);
    },
    showThisProject: function(e) {
      e.preventDefault();
      self.app.showProject(this.model);
      // Set the current project.
      self.app.setCurrentProject(this.model);
      this.highlight();
    },
    highlight: function() {
      // Unhighlight all other projects. Highlight the current project in
      // the project list.
      $('.' + self.names.projectListItemClass)
        .removeClass(self.names.currentProjectClass);
      this.$el.addClass(self.names.currentProjectClass);
    },
    template: function(data) {
      // Explicitely add the `cid'. Otherwise, Backbone's `toJSON' would
      // strip it away.
      data.attributes['cid'] = data.cid;
      return _.template($('#' + self.names.projectListItemTemplateId)
                        .html(), {project: data.toJSON()});
    },
    render: function() {
      this.$el.html(this.template(this.model));
      return this.$el;
    },
    remove: function() {
      var that = this;
      that.$el.slideUp(function() {
        // Remove the model.
        self.app.projectListView.model.remove(that.model.cid)
        // Remove the element itself.
        that.$el.remove();
        // Show and highlightthe first project in the project list. This is
        // necessary if the element that is removed is itself the first
        // element in the project list.
        self.app.showProject(self.app.projectListView.model.models[0]);
      });
    },
  });

  self.ProjectListView = Backbone.View.extend({
    tagName: 'div',
    id: self.names.projectListViewId,
    render: function() {
      $('#' + self.names.projectListViewAnchorId).empty();
      _.each(this.model.models, function(project) {
        $('#' + self.names.projectListViewAnchorId)
          .append(new self.ProjectView({model: project}).render());
      });
    },
  });


  //=======================================================================
  // App
  //=======================================================================

  self.App = function() {
    var that = this;
    that.currentView = null;
    that.currentProject = null;
    that.dropTargetTaskList = null;
    that.dragSourceTaskList = null;
    // This is a quasi-global (!) variable that tells functions that are
    // bound to triggers (i.e. `add') that the corresponding DOM element
    // should not be (re-)rendered. Example: Dropping a task onto a project
    // name in the projects list should still render the current project,
    // not the project associated with the drop target. This compensates
    // for Backbone's lack of a mechanism to selectively cancel functions
    // associated with triggers.
    that.norender = false;

    that.start = function() {
      // Allow the app itself to trigger and listen to events.
      _.extend(that, Backbone.Events);

      // Bind event listeners.
      that.on('remove:task', that.removeTask);

      // Initialize the project list view.
      that.projectListView = new self.ProjectListView({});

      var testTastList = new self.TaskCollection([
        new self.Task({
          name: 'Red task',
          selected: false,
        }),
        new self.Task({
          name: 'Green test task',
          selected: true,
        }),
        new self.Task({
          name: 'Blue test taks with a very long name',
          selected: true,
        }),

        new self.Task({
          name: 'Blue test taks with a very long name',
          selected: true,
        }),
        new self.Task({
          name: 'Blue test taks with a very long name',
          selected: false,
        }),
        new self.Task({
          name: 'Blue test taks with a very long name',
          selected: true,
        }),
        new self.Task({
          name: 'Blue test taks with a very long name',
          selected: false,
        }),
        new self.Task({
          name: 'Blue test taks with a very long name',
          selected: true,
        }),
        new self.Task({
          name: 'Blue test taks with a very long name',
          selected: false,
        }),

      ]);

      // Initialize the task list views.

      // Make the indvidual lists easily referencable.
      that.taskLists = {};
      // `urgent + important'
      that.taskLists[self.names.urgentImportantListId] =
        new self.TaskListView({
          name: self.names.urgentImportantListId,
          model: testTastList,
        });
      that.taskLists[self.names.urgentImportantListId].render();
      // `urgent + not important'
      that.taskLists[self.names.urgentNotImportantListId] =
        new self.TaskListView({
          name: self.names.urgentNotImportantListId,
          model: new self.TaskCollection([]),
        });
      that.taskLists[self.names.urgentNotImportantListId].render();
      // `not urgent + important'
      that.taskLists[self.names.notUrgentImportantListId] =
        new self.TaskListView({
          name: self.names.notUrgentImportantListId,
          model: new self.TaskCollection([]),
        });
      // `not urgent + not important'
      that.taskLists[self.names.notUrgentImportantListId].render();
      that.taskLists[self.names.notUrgentNotImportantListId] =
        new self.TaskListView({
          name: self.names.notUrgentNotImportantListId,
          model: new self.TaskCollection([]),
        });
      that.taskLists[self.names.notUrgentNotImportantListId].render();

      // Make the input field generate new models.
      $('#' + self.names.newTaskInputId).keypress(function(e) {
        if (e.which == 13) {
          e.preventDefault();
          var value = $(this).val();
          if (!/^\s*$/.test(value)) {  // Discard empty strings.
            var newModel = new self.Task({
              name: value,
            });
            that.taskLists[self.names.urgentImportantListId].model
              .unshift(newModel);
          }
          $(this).val('');
        }
      });

      // Make the project list input field generate a new project.
      $('#' + self.names.addProjectInputId).keypress(function(e) {
        if (e.which == 13) {
          e.preventDefault();
          var value = $(this).val();
          if (!/^\s*$/.test(value)) {  // Discard empty strings.
            // Make the `Remove current project' button invisible.
            if (self.app.projectListView.model.length >= 0) {
              $('.' + self.names.removeCurrentProjectButtonClass)
                .removeClass(self.names.invisible);
            }

            var newProject = new self.Project({
              name: value,
              urgentImportantTaskList: new self.TaskListView({
                name: self.names.urgentImportantListId,
                model: new self.TaskCollection([]),
              }).model,
              urgentNotImportantTaskList: new self.TaskListView({
                name: self.names.urgentNotImportantListId,
                model: new self.TaskCollection([]),
              }).model,
              notUrgentImportantTaskList: new self.TaskListView({
                name: self.names.notUrgentImportantListId,
                model: new self.TaskCollection([]),
              }).model,
              notUrgentNotImportantTaskList: new self.TaskListView({
                name: self.names.notUrgentNotImportantListId,
                model: new self.TaskCollection([]),
              }).model,
            });
            self.app.projectListView.model.unshift(newProject);
            self.app.projectListView.render();
          }
          $(this).val('');

          // Set the current project.
          self.app.setCurrentProject(newProject);

          // Show and highlight the first project in the project list.
          self.app.showProject(self.app.projectListView.model.models[0]);
        }
        $(this).blur(function() {
          $(this).val('');
        });
      });

      try {  // Do not accidentially restart the Backbone history.
        Backbone.history.start();
      } catch(error) {
        // Ignore.
      }

      // Projects

      var testProjects = new self.ProjectList([
        new self.Project({
          name: 'Test project',
          urgentImportantTaskList: that.taskLists[
            self.names.urgentImportantListId].model,
          urgentNotImportantTaskList: that.taskLists[
            self.names.urgentNotImportantListId].model,
          notUrgentImportantTaskList: that.taskLists[
            self.names.notUrgentImportantListId].model,
          notUrgentNotImportantTaskList: that.taskLists[
            self.names.notUrgentNotImportantListId].model,
        }),
        new self.Project({
          name: 'Another test project',
          urgentImportantTaskList: new self.TaskListView({
            name: self.names.urgentImportantListId,
            model: new self.TaskCollection([]),
          }).model,
          urgentNotImportantTaskList: new self.TaskListView({
            name: self.names.urgentNotImportantListId,
            model: new self.TaskCollection([]),
          }).model,
          notUrgentImportantTaskList: new self.TaskListView({
            name: self.names.notUrgentImportantListId,
            model: new self.TaskCollection([]),
          }).model,
          notUrgentNotImportantTaskList: new self.TaskListView({
            name: self.names.notUrgentNotImportantListId,
            model: new self.TaskCollection([]),
          }).model,
        }),
        new self.Project({
          name: '!!! Mega project'
        }),
        new self.Project({
          name: '!!! A project with a very long name just for testin purposes'
        }),
        new self.Project({
          name: '!!! Super thing'
        }),
      ]);
      that.projectListView =
        new self.ProjectListView({model: testProjects});
      that.projectListView.render();
    };

    that.removeTask = function(cid) {
      var keys = Object.keys(that.taskLists);
      _.each(keys, function(key) {
        that.taskLists[key].model.remove(cid);
      });
    };

    that.removeSelectedTasks = function() {
      var keys = Object.keys(that.taskLists);
      _.each(keys, function(key) {
        var removables = [];
        that.taskLists[key].model.each(function(task) {
          if (task.get('selected')) {
            removables.push(task);
          }
        });
        // Remove all tasks in one flush so nothing is blocked.
        that.taskLists[key].model.remove(removables);
        that.taskLists[key].render();
      });

    };

    that.show = function(view) {
      if (that.currentView) {
        that.currentView.close();
      }

      that.currentView = view;
      that.currentView.render();

      $('#' + self.names.mainContentId).html(that.currentView.el);
    };

    that.showProject = function(project) {
      try {
        that.taskLists[self.names.urgentImportantListId] = null;
        that.taskLists[self.names.urgentNotImportantListId] = null;
        that.taskLists[self.names.notUrgentImportantListId] = null;
        that.taskLists[self.names.notUrgentNotImportantListId] = null;
      } catch(error) {
        // Ignore it.
      }

      // Add the new views.
      that.taskLists[self.names.urgentImportantListId] =
        new self.TaskListView({
          name: self.names.urgentImportantListId,
          model: project.attributes.urgentImportantTaskList,
        });
      that.taskLists[self.names.urgentNotImportantListId] =
        new self.TaskListView({
          name: self.names.urgentNotImportantListId,
          model: project.attributes.urgentNotImportantTaskList,
        });
      that.taskLists[self.names.notUrgentImportantListId] =
        new self.TaskListView({
          name: self.names.notUrgentImportantListId,
          model: project.attributes.notUrgentImportantTaskList,
        });
      that.taskLists[self.names.notUrgentNotImportantListId] =
        new self.TaskListView({
          name: self.names.notUrgentNotImportantListId,
          model: project.attributes.notUrgentNotImportantTaskList,
        });

      // Render the new views
      var keys = Object.keys(that.taskLists);
      _.each(keys, function(key) {
        that.taskLists[key].render();
      });

      // Set the current project.
      self.app.setCurrentProject(project);

      // Highlight the project in the project list.
      self.app.highlightFirstProject();
    };

    that.removeCurrentProject = function() {
      $('.' + self.names.projectListItemClass).each(function() {
        if ($(this).attr(self.names.projectListItemDataAttributeId) ==
            self.app.currentProject.cid) {
          $(this).slideUp(function() {
            // `setTimeout' compensates for jQuery's `slideUp' being too
            // eager. Also, it feels more intuitive to have a short delay.
            setTimeout(function() {
              try {  // Only remove, if there are any projects.
                // Make the `Remove current project' button invisible.
                if (that.projectListView.model.length <= 1) {
                  $('.' + self.names.removeCurrentProjectButtonClass)
                    .addClass(self.names.invisible);
                }

                // Actually remove the model (The rest is just for
                // animation).
                that.projectListView.model.remove(that.currentProject.cid);
                that.projectListView.render();
                that.showProject(that.projectListView.model.models[0]);
              } catch(error) {
                // Ignore it.
              }
            }, 160);
          });
        }
      });
    };

    that.setCurrentProject = function(project) {
      that.currentProject = project;
    };

    that.highlightFirstProject = function() {
      $('.' + self.names.projectListItemClass + ':first')
        .addClass(self.names.currentProjectClass);
    };
  };

  self.app = new self.App();
  self.app.start();

  // Show and highlight the first project in the project list.
  self.app.setCurrentProject(self.app.projectListView.model.models[0]);
  self.app.highlightFirstProject();

  //=======================================================================
  // Drag & Drop
  //=======================================================================

  // Tasks + task groups

  $('.task-list').sortable({
    connectWith: '.task-list',
    start: function(e, ui) {
      ui.item.addClass(self.names.draggedElementClass);
      var id = $(this).attr('id');
      self.app.dragSourceTaskList = id;
    },
    stop: function(e, ui) {
      ui.item.removeClass(self.names.draggedElementClass);
      var id = $(this).attr('id');
      var index = ui.item.index();
      var list = null;
      var elm = null;
      // If the drop target is the source element itself:
      if (self.app.dropTargetTaskList == null) {
        elm = self.app.dragSourceTaskList;
      } else {
        elm = self.app.dropTargetTaskList;
      }
      list = self.app.taskLists[elm];

      // Drop the element.
      ui.item.trigger('drop', {list: list, index: index});

      // Reset the drop target.
      self.app.dropTargetTaskList = null;
      self.app.dragSourceTaskList = null;
    },
    receive: function(e, ui) {
      self.app.dropTargetTaskList = $(this).attr('id');
    },
  }).disableSelection();


  //=======================================================================
  // Buttons etc.
  //=======================================================================

  $('.' + self.names.removeSelectedButtonClass).click(function(e) {
    e.preventDefault();
    self.app.removeSelectedTasks();
  });

  $('.' + self.names.removeCurrentProjectButtonClass).click(function(e) {
    e.preventDefault();
    self.app.removeCurrentProject();
  });

});
