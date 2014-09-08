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
    taskViewInfoTemplateId: 'task-view-info-template',
    statsTemplateId: 'stats-template',

    taskViewClass: 'task-view',
    taskViewDataAttributeTaskId: 'data-task-id',
    taskViewInfoBoxAnchorClass: 'task-view-info-box-anchor',
    taskViewInfoBoxContentClass: 'task-view-info-box-content',
    taskListViewClass: 'task-list-view',
    projectListViewId: 'project-list-view',
    projectListViewAnchorId: 'projects-list-anchor',
    projectListItemClass: 'project-list-item',
    projectNonEditableClass: 'project-non-editable',
    projectTextBoxClass: 'project-text-box',
    addProjectInputId: 'add-project-input',
    taskSelectionToggleClass: 'task-selection-toggle',
    taskBoxClass: 'task-box',
    taskNameClass: 'task-name',
    taskDescriptionTextareaClass: 'task-description-textarea',
    taskDescriptionNonEditableClass: 'task-description-non-editable',
    taskDescriptionClass: 'task-description',
    taskDescriptionEditButtonClass: 'task-description-edit-button',
    taskDescriptionRemoveButtonClass: 'task-description-remove-button',
    taskDescriptionEditPanelClass: 'task-description-edit-panel',
    taskDescriptionCancelButtonClass: 'task-description-cancel-button',
    taskDescriptionSaveButtonClass: 'task-description-save-button',
    taskNonEditableClass: 'task-non-editable',
    taskTextBoxClass: 'task-text-box',

    urgentImportantListId: 'urgent-important-list',
    urgentNotImportantListId: 'urgent-not-important-list',
    notUrgentImportantListId: 'not-urgent-important-list',
    notUrgentNotImportantListId: 'not-urgent-not-important-list',

    draggedElementClass: 'currently-dragged-element',

    removeTaskButtonClass: 'remove-task-button',
    taskInfoButton: 'task-info-button',
    taskHasDescriptionIndicatorClass: 'task-has-description-indicator',
    removeSelectedButtonClass: 'remove-selected-button',

    removeCurrentProjectButtonClass: 'remove-current-project-button',
    currentProjectClass: 'current-project',
    projectListItemDataAttributeId: 'data-project-id',

    optionsButtonClass: 'options-button',

    invisible: 'invisible',

    // Data import/export/saving
    localStorageProjectsKey: 'projects',

    exportDataButtonClass: 'export-data-button',
    importDataButtonClass: 'import-data-button',

    dataExportPanelClass: 'data-export-panel',
    dataExportTextareaClass: 'data-export-textarea',
    dataExportPanelCloseButtonClass: 'data-export-panel-close-button',

    dataImportPanelClass: 'data-import-panel',
    dataImportTextareaClass: 'data-import-textarea',
    dataImportPanelCloseButtonClass: 'data-import-panel-close-button',
    dataImportButtonClass: 'data-import-button',

    // Dropdown menus
    dropdownMenuClass: 'drop-menu',
    dropdownMenuButtonClass: 'drop-menu-button',
    dropdownMenuBodyClass: 'drop-menu-body',

    // Info Modal
    appInfoButtonClass: 'app-info-button',

    appStatsClass: 'app-stats',
    appStatsButtonClass: 'app-stats-button',
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

  // This are UI-events triggering CRUD operations:
  // - loading the application: read `localStorage'
  //
  // - [x] create new project
  // - [x] delete current project
  // - [x] create new task
  // - [x] delete task
  // - [x] delete all selected tasks
  // - [x] move task to other task list
  // - [x] move task to other project
  // - [x] move task to other position in current task list
  // - [x] change task text
  // - [x] change task selected status
  // - [x] change project
  // - [ ] sort projects list (not implemented yet)
  // - [ ] sort task list by attribute (not implemented yet)

  self.Task = Backbone.Model.extend({
    defaults: {
      name: '',
      description: '',
      created: '' + Date.now(),
      selected: false,
    },
    localStorage: new Backbone.LocalStorage('task'),
  });

  // Collection

  self.TaskCollection = Backbone.Collection.extend({
    model: self.Task,
    initialize: function() {
      this.on('add', function(task) {
        self.app.saveProjects();
      });
      this.on('remove', function(task) {
        self.app.saveProjects();
      });
    },
  });

  self.Project = Backbone.Model.extend({
    defaults: {
      name: '',
      urgentImportantTaskList: new self.TaskCollection([]),
      urgentNotImportantTaskList: new self.TaskCollection([]),
      notUrgentImportantTaskList: new self.TaskCollection([]),
      notUrgentNotImportantTaskList: new self.TaskCollection([]),
    },
    localStorage: new Backbone.LocalStorage('project'),
  });

  // Collection

  self.ProjectList = Backbone.Collection.extend({
    model: self.Project,
    initialize: function() {
      this.on('add', function(project) {
        self.app.saveProjects();
      });
      this.on('remove', function(project) {
        self.app.saveProjects();
      });
    },
  });


  //=======================================================================
  // Views
  //=======================================================================

  self.TaskView = Backbone.View.extend({
    tagName: 'div',
    className: self.names.taskViewClass,
    infoBoxElement: null,
    initialize: function(options) {
      var that = this;

      // The element to which the view should be appended.
      this.element = options['element'];

      // Bind events.
      this.events['click .' + self.names.removeTaskButtonClass] =
        'removeThisTask';
      this.events['click .' + self.names.taskSelectionToggleClass] =
        'toggleSelected';
      this.events['keyup .' + self.names.taskTextBoxClass] =
        'changeName';
      this.events['click .' + self.names.taskInfoButton] =
        'showInfo';

      // Remove if all projects are remove.
      this.listenTo(self.app, 'remove:all-projects', function() {
        that.remove();
      });

      this.$el.attr(self.names.taskViewDataAttributeTaskId,
                    this.model.cid);

      // Styling: Make buttons etc. have the same background/color as the
      // surrounding.
      this.$el.hover(function(e) {
        $(this)
          .find('.' + self.names.taskSelectionToggleClass + ' label').css({
            'background-color': '#F8F8F9',
          });
        $(this)
          .find('.' + self.names.taskInfoButton + ' label').css({
            'background-color': '#F8F8F9',
          });
      }, function(e) {
        $(this).
          find('.' + self.names.taskSelectionToggleClass + ' label').css({
            'background-color': '#FEFEFD',
          });
        $(this)
          .find('.' + self.names.taskInfoButton + ' label').css({
            'background-color': '#FEFEFD',
          });
      });
    },
    events: {
      'drop': 'drop',
      'dblclick': 'edit',
      'mouseover': 'showInfoButton',
      'mouseout': 'hideInfoButton',
    },
    style: function() {
      if (this.model.get('description').length > 0) {
        this.$el.find('.' + self.names.taskHasDescriptionIndicatorClass)
	  .show();
      }
    },
    showInfo: function(e) {
      var that = this;
      var html = this.infoTemplate(this.model);
      var element = $(html);
      self.infoBox(element, {
        show: function(elm) {
          var nonEditable = elm.find(
            '.' + self.names.taskDescriptionNonEditableClass);
          var taskDescription = elm.find(
            '.' + self.names.taskDescriptionClass);
          var editButton = elm.find(
            '.' + self.names.taskDescriptionEditButtonClass);
          var removeButton = elm.find(
            '.' + self.names.taskDescriptionRemoveButtonClass);
          var editPanel = elm.find(
            '.' + self.names.taskDescriptionEditPanelClass);
          var cancelButton = elm.find(
            '.' + self.names.taskDescriptionCancelButtonClass);
          var saveButton = elm.find(
            '.' + self.names.taskDescriptionSaveButtonClass);
          var textarea = elm.find(
            '.' + self.names.taskDescriptionTextareaClass);


          removeButton.click(function() {
            self.confirmationDialog({
              text: 'Do you really want to remove the desscription for \
this task?',
              yes: 'Yes',
              no: 'No',
              action: function() {
                taskDescription.html('');
                that.removeDescription()
              },
              animation: 'no',
            });

          });

          editButton.click(function() {
            // Reset the `textarea' text in case it has been edited, but
            // canceled (browsers tend to cache the text value).
            textarea.val(that.model.get('description'));

            nonEditable.slideUp('fast');
            editPanel.slideDown('fast', function() { textarea.focus(); });
          });

          cancelButton.click(function() {
            editPanel.slideUp('fast');
            nonEditable.slideDown('fast');
          });

          saveButton.click(function() {
            var newDescription = textarea.val();
            // Only save, if the new description is not blank
            // (whitespace-only counts as blank).
            if (!/^\s*$/.test(newDescription)) {
              that.setDescription(newDescription);
              taskDescription.html(newDescription);
            }
            editPanel.slideUp('fast');
            nonEditable.slideDown('fast');
            editButton.html('Edit');
          });

        },
	hide: function() {
	  that.rerender();
	},
      });
    },
    showInfoButton: function(e) {
      this.$el.find('.' + self.names.taskInfoButton).show();
    },
    hideInfoButton: function(e) {
      this.$el.find('.' + self.names.taskInfoButton).hide();
    },
    infoTemplate: function(data) {
      return _.template($('#' + self.names.taskViewInfoTemplateId)
                        .html(), data.toJSON());
    },
    setDescription: function(description) {
      this.model.set({description: description});
      self.app.saveProjects();
    },
    removeDescription: function(description) {
      this.model.set({description: ''});
      self.app.saveProjects();
    },
    edit: function(e) {
      var that = this;
      that.$el.find('.' + self.names.taskNonEditableClass)
        .slideUp(80, function() {
          that.$el.find('.' + self.names.taskTextBoxClass)
            .slideDown(80).select();
        });
    },
    changeName: function(e) {
      var that = this;
      var newName = that.$el.find('.' + self.names.taskTextBoxClass).val();
      if (e.which == 13 || e.which == 27) {  // Return & Escape
        e.preventDefault();
        if (e.which == 13 && !/^\s*$/.test(newName)) {  // Return
          that.model.set({name: newName});
        }
        that.$el.find('.' + self.names.taskTextBoxClass)
          .fadeOut(80, function() {
            that.$el.find('.' + self.names.taskNameClass)
              .fadeIn(80, function() {
                // Save the new value
                self.app.saveProjects();
                that.rerender();
              }).select();
          });
      }
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
      self.confirmationDialog({
        text: 'Do you really want to remove this task?',
        yes: 'Yes',
        no: 'No',
        action: function() {
          // Animate the element.
          that.$el.animate({
            'opacity': '0.001',
          }, 'fast', function() {
            that.$el.slideUp(function() {
              // Actually remove the element.
              that.$el.remove();
            });
          });
          self.app.trigger('remove:task', that.model.cid);
        },
      });
    },
    toggleSelected: function() {
      this.model.set({selected: !this.model.get('selected')})
      self.app.saveProjects();
      this.rerender();
    },
    template: function(data) {
      return _.template($('#' + self.names.taskViewTemplateId)
                        .html(), data.toJSON());
    },
    rerender: function() {
      this.$el.html(this.template(this.model));
      this.style();
    },
    render: function() {
      this.$el.html(this.template(this.model));
      if (this.element) {  // Be extra-cautious.
        this.element.append(this.$el);
      }
      this.style();
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
      'dblclick': 'edit',
    },
    initialize: function() {
      self.makeProjectDroppable(this);

      // Bind events
      this.events['keyup .' + self.names.projectTextBoxClass] =
        'changeName';
    },
    edit: function(e) {
      var that = this;
      that.$el.find('.' + self.names.projectNonEditableClass)
        .slideUp(80, function() {
          that.$el.find('.' + self.names.projectTextBoxClass)
            .slideDown(80).select();
        });
    },
    changeName: function(e) {
      var that = this;
      var newName = that.$el.find('.' + self.names.projectTextBoxClass).val();
      if (e.which == 13 || e.which == 27) {  // Return & Escape
        e.preventDefault();
        if (e.which == 13 && !/^\s*$/.test(newName)) {  // Return
          that.model.set({name: newName});
        }
        that.$el.find('.' + self.names.projectTextBoxClass)
          .fadeOut(80, function() {
            that.$el.find('.' + self.names.projectListItemClass)
              .fadeIn(80, function() {
                // Save the new value
                self.app.saveProjects();
                that.render();
              }).select();
          });
      }
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

    // Use this object as a primitive `message bus' (no queuing etc.!)
    // since it provides a global-ish application state for various
    // components anyway. Semantically, this fits better than introducing
    // another special-purpose object.
    _.extend(that, Backbone.Events);

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

      var testTaskList = new self.TaskCollection([
        // This is some test data intended for debugging.
        // Do not remove this!
        // (It may not conform to best practices, but it is incredibly
        // useful to have this around.)

        // new self.Task({
        //   name: 'Red task',
        //   selected: false,
        // }),
        // new self.Task({
        //   name: 'Green test task',
        //   selected: true,
        // }),
        // new self.Task({
        //   name: 'Blue test taks with a very long name',
        //   selected: true,
        // }),

        // new self.Task({
        //   name: 'Blue test taks with a very long name',
        //   selected: true,
        // }),
        // new self.Task({
        //   name: 'Blue test taks with a very long name',
        //   selected: false,
        // }),
        // new self.Task({
        //   name: 'Blue test taks with a very long name',
        //   selected: true,
        // }),
        // new self.Task({
        //   name: 'Blue test taks with a very long name',
        //   selected: false,
        // }),
        // new self.Task({
        //   name: 'Blue test taks with a very long name',
        //   selected: true,
        // }),
        // new self.Task({
        //   name: 'Blue test taks with a very long name',
        //   selected: false,
        // }),

      ]);

      // Initialize the task list views.

      // Make the indvidual lists easily referencable.
      that.taskLists = {};
      // `urgent + important'
      that.taskLists[self.names.urgentImportantListId] =
        new self.TaskListView({
          name: self.names.urgentImportantListId,
          model: testTaskList,
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

      // Make the task input field generate new models.
      $('#' + self.names.newTaskInputId).keypress(function(e) {
        if (e.which == 13) {
          e.preventDefault();
          var value = $(this).val();
          // Discard empty strings.
          if (!/^\s*$/.test(value)) {
            // Focus the `Add a new project' input field if there is no
            // project defined yet.
            if (that.currentProject == null) {
              $('#' + self.names.addProjectInputId).focus();
            } else {
              var newModel = new self.Task({
                name: value,
                created: '' + Date.now(),
              });
              that.taskLists[self.names.urgentImportantListId].model
                .unshift(newModel);

              // Scroll the `Urgent + Important' task list to the top, so
              // the newly inserted tasks are visible.
              $('.' + self.names.taskBoxClass).first().animate({
                'scrollTop': '0',
              });

              // Animation: Slide the new task in.
              $('.' + self.names.taskBoxClass)
                .find('.' + self.names.taskViewClass)
                .first()
                .hide()
                .slideDown();

            }
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
        // This is some test data intended for debugging.
        // Do not remove this!
        // (It may not conform to best practices, but it is incredibly
        // useful to have this around.)

        // new self.Project({
        //   name: 'Test project',
        //   urgentImportantTaskList: that.taskLists[
        //     self.names.urgentImportantListId].model,
        //   urgentNotImportantTaskList: that.taskLists[
        //     self.names.urgentNotImportantListId].model,
        //   notUrgentImportantTaskList: that.taskLists[
        //     self.names.notUrgentImportantListId].model,
        //   notUrgentNotImportantTaskList: that.taskLists[
        //     self.names.notUrgentNotImportantListId].model,
        // }),
        // new self.Project({
        //   name: 'Another test project',
        //   urgentImportantTaskList: new self.TaskListView({
        //     name: self.names.urgentImportantListId,
        //     model: new self.TaskCollection([]),
        //   }).model,
        //   urgentNotImportantTaskList: new self.TaskListView({
        //     name: self.names.urgentNotImportantListId,
        //     model: new self.TaskCollection([]),
        //   }).model,
        //   notUrgentImportantTaskList: new self.TaskListView({
        //     name: self.names.notUrgentImportantListId,
        //     model: new self.TaskCollection([]),
        //   }).model,
        //   notUrgentNotImportantTaskList: new self.TaskListView({
        //     name: self.names.notUrgentNotImportantListId,
        //     model: new self.TaskCollection([]),
        //   }).model,
        // }),
        // new self.Project({
        //   name: '!!! Mega project'
        // }),
        // new self.Project({
        //   name:
        //   '!!! A project with a very long name just for testin purposes'
        // }),
        // new self.Project({
        //   name: '!!! Super thing'
        // }),

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
      } catch(error) {
        // Ignore it.
      }
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
                // Show the first project, if there is one, else remove all
                // remaining task objects that are still shown.
                if (that.projectListView.model.models[0]) {
                  that.showProject(that.projectListView.model.models[0]);
                } else {
                  that.trigger('remove:all-projects');

                  // Empty all current task lists;
                  var keys = Object.keys(that.taskLists);
                  _.each(keys, function(key) {
                    that.taskLists[key].model.models = [];
                  });

                  that.currentProject = null;
                }
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

    that.saveProjects = function() {
      window.localStorage.setItem(
        self.names.localStorageProjectsKey,
        JSON.stringify(that.projectListView.model));

      // For debugging, print all save actions.
      // (Do not remove this code!)
      //
      // console.log(Date.now());
      // console.log(window.localStorage.getItem(self.names.localStorageProjectsKey));
    };

    that.exportData = function() {
      var data = window.localStorage.getItem(self.names.localStorageProjectsKey);

      // Remove the textarea element and reappend it so that browserd do
      // not `cache' the text of this textarea element because
      // force-reloaing the page is not an option here.
      var textarea = $('.' + self.names.dataExportTextareaClass);
      var anchor = textarea.prev();
      textarea.remove();
      $(textarea).insertAfter(anchor);

      $('.' + self.names.dataExportTextareaClass).text(data);
      $('.' + self.names.dataExportPanelClass).slideDown();
      $('.' + self.names.dataExportTextareaClass).select();
    };

    that.showImportPanel = function() {
      $('.' + self.names.dataImportPanelClass).slideDown();
      $('.' + self.names.dataImportTextareaClass).select();
    };

    that.importData = function(data) {
      var keys = Object.keys(that.taskLists);
      _.each(keys, function(key) {
        that.taskLists[key].model.reset([]);
        that.taskLists[key].render();
      });

      // Clear the project list
      that.projectListView.model.reset([]);
      that.projectListView.render();

      var projects = JSON.parse(data);

      // Only import data, if there is data, otherwise show the welcome
      // projects.
      if (projects == null || !projects.length > 0) {
        // Import sample data.
        // (For futue changes: When copying the exported string here, quote
        // it using single quotes and escape all contained double quotes
        // with a backslash.)
        projects = JSON.parse('[{\"name\":\"Intro\",\"urgentImportantTaskList\":[{\"name\":\"1. Click \\"Options\\", then \\"Info\\".\",\"selected\":false},{\"name\":\"2. Drag me to another task list.\",\"selected\":false},{\"name\":\"3. Double click me to rename.\",\"selected\":false},{\"name\":\"4. Remove me by clicking \\"X\\".\",\"selected\":false},{\"name\":\"5. Click \\"Options\\", then \\"Remove current project\\".\",\"selected\":false}],\"notUrgentImportantTaskList\":[],\"urgentNotImportantTaskList\":[],\"notUrgentNotImportantTaskList\":[],\"cid\":\"c16\"},{\"name\":\"Example Project\",\"urgentImportantTaskList\":[{\"name\":\"Call your mom.\",\"selected\":false},{\"name\":\"Send application email.\",\"selected\":true}],\"notUrgentImportantTaskList\":[{\"name\":\"Buy some groceries.\",\"selected\":false},{\"name\":\"Be nice.\",\"selected\":true},{\"name\":\"Eat healthy.\",\"selected\":false},{\"name\":\"Brush your teeth.\",\"selected\":false}],\"urgentNotImportantTaskList\":[{\"name\":\"Clean the gutter.\",\"selected\":false},{\"name\":\"Buy toilet paper.\",\"selected\":true},{\"name\":\"Send party invitations.\",\"selected\":true}],\"notUrgentNotImportantTaskList\":[{\"name\":\"Meet new people.\",\"selected\":false},{\"name\":\"Remove this example project.\",\"selected\":true}],\"cid\":\"c28\"}]');
      }

      var newProjects = new self.ProjectList([]);
      _.each(projects, function(project) {
        // Urgent + Important
        var newUrgentImportantTaskList = new self.TaskCollection([]);
        _.each(project.urgentImportantTaskList, function(task) {
          var newTask = new self.Task({
            name: task.name,
            description: task.description,
            created: task.date,
            selected: task.selected,
          });
          newUrgentImportantTaskList.add(newTask);
        });

        // Not Urgent + Important
        var newNotUrgentImportantTaskList = new self.TaskCollection([]);
        _.each(project.notUrgentImportantTaskList, function(task) {
          var newTask = new self.Task({
            name: task.name,
            description: task.description,
            created: task.date,
            selected: task.selected,
          });
          newNotUrgentImportantTaskList.add(newTask);
        });

        // Urgent + Not Important
        var newUrgentNotImportantTaskList = new self.TaskCollection([]);
        _.each(project.urgentNotImportantTaskList, function(task) {
          var newTask = new self.Task({
            name: task.name,
            description: task.description,
            created: task.date,
            selected: task.selected,
          });
          newUrgentNotImportantTaskList.add(newTask);
        });

        // Not Urgent + Not Important
        var newNotUrgentNotImportantTaskList = new self.TaskCollection([]);
        _.each(project.notUrgentNotImportantTaskList, function(task) {
          var newTask = new self.Task({
            name: task.name,
            description: task.description,
            created: task.date,
            selected: task.selected,
          });
          newNotUrgentNotImportantTaskList.add(newTask);
        });

        var newProject = new self.Project({
          name: project.name,
          urgentImportantTaskList: newUrgentImportantTaskList,
          notUrgentImportantTaskList: newNotUrgentImportantTaskList,
          urgentNotImportantTaskList: newUrgentNotImportantTaskList,
          notUrgentNotImportantTaskList: newNotUrgentNotImportantTaskList,
        });
        newProjects.add(newProject);
      });

      that.projectListView =
        new self.ProjectListView({model: newProjects});
      that.projectListView.render();

      // Save the projects
      that.saveProjects();

      // Show the first project.
      var firstProject = that.projectListView.model.models[0]
      that.showProject(firstProject);
      that.setCurrentProject(firstProject);
      that.highlightFirstProject();
    };

    that.showStats = function() {
      var data = {
	totals: {
	  projectsNum: self.app.projectListView.model.length,
	  tasksNum: 0,
	  urgentImportantTaskListNum: 0,
	  notUrgentImportantTaskListNum: 0,
	  urgentNotImportantTaskListNum: 0,
	  notUrgentNotImportantTaskListNum: 0,
	  tasksWithDescriptionNum: 0,
	},
	projects: [],
      };

      var numUrgentImportantTaskListTasks = 0;
      var projects = self.app.projectListView.model.models;
      _.each(projects, function(project) {
	var urgentImportantTaskListNum =
	  project.attributes.urgentImportantTaskList.length;
	var notUrgentImportantTaskListNum =
	  project.attributes.notUrgentImportantTaskList.length;
	var urgentNotImportantTaskListNum =
	  project.attributes.urgentNotImportantTaskList.length;
	var notUrgentNotImportantTaskListNum =
	  project.attributes.notUrgentNotImportantTaskList.length;

	data.projects.unshift({
	  name: project.attributes.name,

	  urgentImportantTaskListNum:
	  urgentImportantTaskListNum,

	  notUrgentImportantTaskListNum:
	  notUrgentImportantTaskListNum,

	  urgentNotImportantTaskListNum:
	  urgentNotImportantTaskListNum,

	  notUrgentNotImportantTaskListNum:
	  notUrgentNotImportantTaskListNum,
	});

	data.totals.urgentImportantTaskListNum +=
	urgentImportantTaskListNum;

	data.totals.notUrgentImportantTaskListNum +=
	notUrgentImportantTaskListNum;

	data.totals.urgentNotImportantTaskListNum +=
	urgentNotImportantTaskListNum;

	data.totals.notUrgentNotImportantTaskListNum +=
	notUrgentNotImportantTaskListNum;

	data.totals.tasksNum +=
	urgentImportantTaskListNum +
	  notUrgentImportantTaskListNum +
	  urgentNotImportantTaskListNum +
	  notUrgentNotImportantTaskListNum;

      });

      var html =_.template($('#' + self.names.statsTemplateId)
			   .html(), data);      
      self.infoBox($(html));
    };
  };

  self.app = new self.App();
  self.app.start();

  // For debugging, clear all `localStorage' data.
  // Do not remove this line, so you do not forget this!
  //
  // window.localStorage.clear();

  // Import data from `localStorage' or  show the welcome projects.
  self.app.importData(window.localStorage.getItem(
    self.names.localStorageProjectsKey))



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

  // `Remove selected tasks' button.
  $('.' + self.names.removeSelectedButtonClass).click(function(e) {
    e.preventDefault();
    self.confirmationDialog({
      text: 'Do you really want to remove all currently selected tasks?',
      yes: 'Yes',
      no: 'No',
      action: self.app.removeSelectedTasks,
    });
  });

  // `Remove current project' button.
  $('.' + self.names.removeCurrentProjectButtonClass).click(function(e) {
    e.preventDefault();
    // self.app.removeCurrentProject();
    self.confirmationDialog({
      text: 'Do you really want to remove the current project?',
      yes: 'Yes',
      no: 'No',
      action: self.app.removeCurrentProject,
    });
  });

  // Import data button
  $('.' + self.names.importDataButtonClass).click(function(e) {
    e.preventDefault();
    self.app.showImportPanel();
    // Hide the dropdown menu.
    $('.' + self.names.dropdownMenuBodyClass).fadeOut('fast');
  });

  // Export data button
  $('.' + self.names.exportDataButtonClass).click(function(e) {
    e.preventDefault();
    self.app.exportData();
    // Hide the dropdown menu.
    $('.' + self.names.dropdownMenuBodyClass).fadeOut('fast');
  });

  // Make the data export panel closable.
  $('.' + self.names.dataExportPanelCloseButtonClass).click(function() {
    $('.' + self.names.dataExportPanelClass).animate({
      'opacity': '0.0',
    }, 'fast');
    $('.' + self.names.dataExportPanelClass).slideUp(function() {
      $('.' + self.names.dataExportPanelClass).css({'opacity': '1.0',});
    });
  });

  // Make the data import panel closable.
  $('.' + self.names.dataImportPanelCloseButtonClass).click(function() {
    $('.' + self.names.dataImportPanelClass).animate({
      'opacity': '0.0',
    }, 'fast');
    $('.' + self.names.dataImportPanelClass).slideUp(function() {
      $('.' + self.names.dataImportPanelClass).css({'opacity': '1.0',});
    });
  });

  // Make data import button import the data.
  $('.' + self.names.dataImportButtonClass).click(function() {
    $('.' + self.names.dataImportPanelClass).animate({
      'opacity': '0.0',
    }, 'fast');
    $('.' + self.names.dataImportPanelClass).slideUp(function() {
      $('.' + self.names.dataImportPanelClass).css({'opacity': '1.0',});
    });
    var data = $('.' + self.names.dataImportTextareaClass).val();
    self.app.importData(data);
  });


  // Dropdown menus

  $('.' + self.names.dropdownMenuButtonClass).click(function(e) {
    e.preventDefault();
    $(this).parent('.' + self.names.dropdownMenuClass)
      .find('.' + self.names.dropdownMenuBodyClass).fadeToggle('fast');
    e.stopPropagation();
  });

  $('.' + self.names.dropdownMenuClass).click(function(e) {
    e.stopPropagation();
  });

  $(document).click(function(e) {
    $('.' + self.names.dropdownMenuBodyClass).fadeOut('fast');
  });


  // App info

  $('.' + self.names.appInfoButtonClass).click(function(e) {
    e.preventDefault();
    self.infoBox(
      '\
<h2 class="text-center list-group-item bg-neutral">Info</h2>\
<hr/>\
\
\
<p>\
<em>Eisenhower</em> \
lets you manage tasks using the \
<a href="http://en.wikipedia.org/wiki/Time_management#The_Eisenhower_Method">\
Eisenhower method\
</a>\
.\
</p>\
\
\
<hr/>\
<h3>Projects</h3>\
<p>\
To organize your tasks, you can have multiple \
<strong>projects</strong>\
. Every project has four task lists:\
<ol>\
<li><strong>Urgent + important</strong></li>\
<li><strong>Not urgent + important</strong></li>\
<li><strong>Urgent + not important</strong></li>\
<li><strong>Not urgent + not important</strong></li>\
</ol>\
To create a project, click \
<strong>Add a new project</strong> \
and give your new project a name.\
</p>\
\
<p>\
A project can be renamed by double clicking its name in the project \
list.\
</p>\
\
\
<hr/>\
<h3>Tasks</h3>\
<p>\
Every task is assigned to one of the four task lists \
<strong>Urgent + important</strong>, \
<strong>Not urgent + important</strong>, \
<strong>Urgent + not important</strong> or \
<strong>Not urgent + not important</strong>\
.\
</p>\
\
<p>\
A task can be moved between lists by dragging it from its current\
list and dropping it onto a different list. The position of a task \
within a list can be changed by drag & drop, too.\
</p>\
\
<p>\
To create a task, click the \
<strong>Add a new task</strong>\
text box and give your new project a name. Every new task is added to \
the \
<strong>Urgent + important</strong> \
task list of the current project.\
</p>\
\
<p>\
To select a task, use its checkbox.\
</p>\
\
<p>\
To rename a task, double click its name.\
</p>\
\
<p>\
To remove a task, click its close button (\
<span class="close-button">&times;</span>\
).\
</p>\
\
\
<hr/>\
<h3>Options</h3>\
<p>\
To access various options, click \
<strong>Options</strong>\
.\
</p>\
\
<p>\
These are the available options: \
<ul>\
<li><strong>Remove selected tasks</strong>: \
Remove all selected task of the currently active project (\
No worries, selected tasks of other projects will not be \
removed)</li>\
<li><strong>Remove current project</strong>: \
Remove the currently active project.</li>\
<li><strong>Import</strong>: \
Import projects data.</li>\
<li><strong>Export</strong>: \
Export the data for all projects; this data can be imported using\
the \
<strong>Import</strong> option.</li>\
<li><strong>Info</strong>: \
Shows this info.</li>\
</ul>\
\
</p>\
\
\
<hr/>\
<h3>Saving</h3>\
<p>\
<em>Eisenhower</em> automatically saves every action you perform.\
Manual saving is not required.\
</p>\
\
<hr/>\
'
    );
  });

  // App stats

  $('.' + self.names.appStatsButtonClass).click(function(e) {
    self.app.showStats();
  });


  //=======================================================================
  // Confirmation menu
  //=======================================================================

  self.confirmationDialog = function(options) {
    var text = options['text'] || 'Really perform that action?';
    var yes = options['yes'] || 'Yes';
    var no = options['no'] || 'No';
    var action = options['action'] || function() { /* Do nothing. */ };
    var animation = options['animation'] || 'yes';

    var dialog = $(
      '<div class="confirmation-dialog">' +
        '<div class="confirmation-dialog-backdrop"></div>' +

      '<div class="confirmation-dialog-body">' +

      '<p class="confirmation-dialog-text">' +
        text +
        '<p>' +

      '<div class="confirmation-dialog-button-panel">' +
        '<a href="" class="confirmation-dialog-yes-button">' +
        yes +
        '</a>' +
        '<a href="" class="confirmation-dialog-no-button">' +
        no +
        '</a>' +
        '</div>' +

      '</div>'+

      '</div>'
    );

    // Styling

    $(dialog).find('.confirmation-dialog-body').css({
      'position': 'fixed',
      'width': '280px',
      'height': '180px',
      'padding': '20px',
      'top': '50%',
      'left': '50%',
      'margin-top': '-140px',
      'margin-left': '-140px',
      'z-index': '9999',
      'background-color': '#FEFEFD',
      'border': '1px solid rgba(0, 0, 0, 0.3)',
      'box-shadow': '0 2px 5px rgba(50, 50, 150, 0.3)',
      'border-radius': '6px',
      'text-align': 'center',
    });

    $(dialog).find('.confirmation-dialog-button-panel').css({
      'display': 'inline',
    });

    $(dialog).find('.confirmation-dialog-button-panel').css({
      'padding': '30px',
      'display': 'block',
    });

    $(dialog).find('.confirmation-dialog-button-panel a').css({
      'margin': '20px',
      'padding': '10px',
      'border-radius': '6px',
      'background-color': '#E1E1E1',
      'color': '#F8F8F8',
    });

    $(dialog).find('.confirmation-dialog-button-panel a')
      .mouseover(function(e) {
      $(this).css({
        'text-decoration': 'none',
        'opacity': '0.8',
      });
    });

    $(dialog).find('.confirmation-dialog-button-panel a')
      .mouseout(function(e) {
      $(this).css({
        'opacity': '1.0',
      });
    });

    $(dialog).find('.confirmation-dialog-yes-button').css({
      'background-color': 'green',
    });

    $(dialog).find('.confirmation-dialog-no-button').css({
      'background-color': '#AF1212',
    });

    $(dialog).find('.confirmation-dialog-backdrop').css({
      'position': 'fixed',
      'top': '0',
      'left': '0',
      'background-color': 'rgba(0, 0, 0, 0.3)',
      'width': '100%',
      'height': '100%',
      'z-index': '9998',
    });

    $(dialog).find('.confirmation-dialog-body').css({
      'z-index': '9999',
    });

    // Append the element.
    if (animation == 'yes') {
      $('body').append($(dialog).hide().fadeIn());
    } else {
      $('body').append($(dialog)).show();
    }


    // Functionality

    var hideDialog = function() {
      if (animation == 'yes') {
        $(dialog).fadeOut(function() {
          $(this).remove('fast');
        });
      } else {
        $(dialog).hide(0, function() {
          $(this).remove('fast');
        });
      }
    };

    // Handle a `Yes' button click.
    $('.confirmation-dialog-yes-button').click(function(e) {
      e.preventDefault();
      hideDialog();
      action();
    });

    // Handle a `No' button click.
    $('.confirmation-dialog-no-button').click(function(e) {
      e.preventDefault();
      hideDialog();
    });

    // Handle a backdrop button click.
    $('.confirmation-dialog-backdrop').click(function(e) {
      e.preventDefault();
      hideDialog();
    });

  }


  //=======================================================================
  // Info Box
  //=======================================================================

  // Show a info modal with the specified content.
  //
  // element - The jQuery element or HTML string that should become the
  //           content of the modal.
  // options - Callbacks to be performed after insertion or after removal
  //           of the modal (`show': called after insertion; `hide':
  //           called after removal).
  //
  // Example
  //
  //   self.infoBox($('<p>This is some info.</p>', {
  //     show: function() {
  //       console.log('Info box inserted.');
  //     },
  //     hide: function() {
  //       console.log('Info box hidden.');
  //     }
  //   })
  //
  // Returns nothing.
  self.infoBox = function(element, options) {
    var options = options || {};
    var onShow = options['show'] || function() { /* Do nothing. */ };
    var onHide = options['hide'] || function() { /* Do nothing. */ };
    if (typeof element == 'string') {
      element = $(element);
    }

    var infoBox = $(
      '<div class="info-modal-box">' +
        '<div class="info-modal-backdrop"></div>' +

      '<div class="info-modal-body">' +
        '<a href="#" class="info-modal-close-button">&times;</a>' +
      '<div class="info-modal-body-content"></div>' +
      '</div>'+

      '</div>'
    );
    // Actually append the content.
    infoBox.find('.info-modal-body-content').append(element)

    $('body').append($(infoBox).hide());
    infoBox.fadeIn(function() {
      onShow($(this));
    });

    $('.info-modal-box').css({
      'position': 'absolute',
    });

    $('.info-modal-body').css({
      'position': 'fixed',
      'top': '0',
      'left': '0',
      'width': '50%',
      'height': '100%',
      'padding': '20px',
      'background-color': '#FEFEFD',
      'border': '1px solid rgba(0, 0, 0, 0.3)',
      'box-shadow': '0 2px 35px rgba(50, 50, 150, 0.3)',
      'z-index': '9997',
      'overflow': 'auto',
    });

    $('.info-modal-body-content').css({
      'margin-top': '30px',
    });

    $('.info-modal-backdrop').css({
      'position': 'fixed',
      'top': '0',
      'left': '0',
      'background-color': 'rgba(255, 255, 255, 0.5)',
      'width': '100%',
      'height': '100%',
      'z-index': '9996',
    });

    $('.info-modal-close-button').css({
      'float': 'right',
      'color': '#57534A',
      'font-size': '25px',
      'font-weight': 'bold',
      'margin-top': '-15px',
    });

    $('.info-modal-close-button').mouseover(function() {
      $(this).css({
        'opacity': '0.8',
        'text-decoration': 'none',
      });
    });

    $('.info-modal-close-button').mouseout(function() {
      $(this).css({
        'opacity': '1.0',
      });
    });

    // Functionality

    var hideInfoModal = function() {
      $(infoBox).fadeOut(function() {
        $(this).remove('fast');
        onHide();
      });
    };

    // Handle a backdrop button click.
    $('.info-modal-backdrop, .info-modal-close-button').click(function(e) {
      e.preventDefault();
      hideInfoModal();
    });

  };
});
